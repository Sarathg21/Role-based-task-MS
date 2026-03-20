import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import CustomSelect from '../components/UI/CustomSelect';
import {
    Users, BarChart2, CheckSquare, AlertTriangle, Clock,
    Activity, TrendingUp, Calendar, ChevronDown, ChevronLeft, ChevronRight, Layout,
    CheckCircle, Shield, Target, Plus, Search, HelpCircle,
    ArrowRight, Loader2, Bell, Settings, User, Briefcase, Building2, AlertCircle, ExternalLink
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
    
    // Case like "Exec 1"
    if (parts.length > 1 && /^\d+$/.test(lastPart)) {
        return (firstPart[0] + lastPart).toUpperCase();
    }
    
    // Case like "AP Manager"
    if (parts.length > 1) {
        return (firstPart[0] + parts[1][0]).toUpperCase();
    }
    
    // Fallback
    return firstPart[0].toUpperCase() + (firstPart[1] || '').toUpperCase();
};

const PerformanceDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
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
    const [selectedDept, setSelectedDept] = useState('');
    const [fromDate, setFromDate] = useState(localStorage.getItem('dashboard_from_date') || getSixMonthsAgo());
    const [toDate, setToDate] = useState(localStorage.getItem('dashboard_to_date') || getToday());

    // Data
    const [summary, setSummary] = useState({
        team_tasks: 0,
        in_progress_tasks: 0,
        pending_approval: 0,
        overdue_tasks: 0
    });
    const [trends, setTrends] = useState([]);
    const [teamPerformance, setTeamPerformance] = useState([]);
    const [employeeRisk, setEmployeeRisk] = useState([]);
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

    const aggregateFallbackData = useCallback((tasks, baseRegistry = []) => {
        if (!tasks.length && !baseRegistry.length) return;

        // KPI Summary
        const total = tasks.length;
        const inProgress = tasks.filter(t => (t.status || '').toUpperCase() === 'IN_PROGRESS').length;
        const pending = tasks.filter(t => ['SUBMITTED', 'PENDING', 'PENDING_APPROVAL'].includes((t.status || '').toUpperCase())).length;
        const overdueCount = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['APPROVED', 'CANCELLED'].includes((t.status || '').toUpperCase())).length;
        
        setSummary({
            team_tasks: total,
            in_progress_tasks: inProgress,
            pending_approval: pending,
            overdue_tasks: overdueCount
        });

        // Trends
        const days = 180;
        const trendMap = {};
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const monthName = d.toLocaleDateString('en-US', { month: 'short' });
            trendMap[key] = { 
                name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
                month: monthName,
                new: 0, 
                pending: 0, 
                overdue: 0,
                dateKey: key
            };
        }
        
        tasks.forEach(t => {
            const rawDate = t.created_at || t.assigned_date || t.createdAt || t.assignedAt || t.date || t.due_date;
            if (!rawDate) return;
            
            const date = typeof rawDate === 'string' ? rawDate.split('T')[0] : new Date(rawDate).toISOString().split('T')[0];
            const status = (t.status || '').toUpperCase();
            
            if (trendMap[date]) {
                trendMap[date].new++;
                if (['SUBMITTED', 'PENDING', 'PENDING_APPROVAL', 'IN_PROGRESS'].includes(status)) {
                    trendMap[date].pending++;
                }
                const isOverdue = t.due_date && new Date(t.due_date) < new Date() && !['APPROVED', 'COMPLETED', 'CANCELLED'].includes(status);
                if (isOverdue) {
                    trendMap[date].overdue++;
                }
            }
        });
        setTrends(Object.values(trendMap).sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey)));

        // Team Performance
        const empMap = {};
        
        // Pre-populate with registry to ensure everyone is listed
        baseRegistry.forEach(emp => {
            const name = emp.name;
            empMap[name] = { 
                name, 
                tasks_assigned: 0, 
                in_progress: 0, 
                pending_review: 0, 
                overdue: 0, 
                completed: 0, 
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
            completion_rate: Math.round((e.completed / (e.tasks_assigned || 1)) * 100)
        })).sort((a, b) => b.tasks_assigned - a.tasks_assigned);
        
        setTeamPerformance(perfData);

        // Risk
        setEmployeeRisk(perfData.map(e => ({
            name: e.name,
            active_tasks: e.tasks_assigned - e.completed,
            overdue_tasks: e.overdue,
            performance_score: e.completion_rate,
            department: e.department,
            risk_status: e.overdue > 2 ? 'OFF_TRACK' : e.overdue > 1 ? 'AT_RISK' : e.overdue === 1 ? 'WATCH' : 'ON_TRACK'
        })));

        // Dept Metrics
        const completed = tasks.filter(t => ['APPROVED', 'COMPLETED'].includes((t.status || '').toUpperCase())).length;
        const submitted = tasks.filter(t => (t.status || '').toUpperCase() === 'SUBMITTED').length;
        setDeptMetrics({
            total_tasks: total,
            completed_tasks: completed,
            submitted_tasks: submitted,
            overdue_tasks: overdueCount,
            active_tasks: total - completed - tasks.filter(t => (t.status || '').toUpperCase() === 'CANCELLED').length,
            completion_pct: Math.round((completed / (total || 1)) * 100)
        });
    }, []);

    const fetchDashData = useCallback(async () => {
        const currentDeptId = selectedDept === 'all' ? '' : selectedDept;
        setLoading(true);

        try {
            const base = isCFO ? '/dashboard/cfo' : '/dashboard/manager';
            const extendedParams = { 
                department_id: currentDeptId,
                start_date: fromDate,
                end_date: toDate,
                from_date: fromDate,
                to_date: toDate,
                scope: currentDeptId ? 'department' : 'org',
                type: currentDeptId ? 'department' : 'org',
                limit: 100
            };
            
            // Clean empty params
            Object.keys(extendedParams).forEach(key => !extendedParams[key] && delete extendedParams[key]);

            const empParams = { active: true, limit: 100 };
            if (currentDeptId) empParams.department_id = currentDeptId;

            const results = await Promise.allSettled([
                api.get(base, { params: extendedParams }),
                api.get(`${base}/department-metrics`, { params: extendedParams }),
                api.get(`${base}/trends`, { params: { ...extendedParams, days: 30 } }),
                api.get(`${base}/team-performance`, { params: { ...extendedParams, limit: 50 } }),
                api.get(`${base}/employee-risk`, { params: { ...extendedParams, limit: 5 } }),
                api.get(isCFO ? '/tasks' : '/tasks/team', { params: { ...extendedParams, scope: currentDeptId ? 'department' : 'org', limit: 100 } }),
                api.get('/employees', { params: empParams })
            ]);

            // 1. KPI Summary
            if (results[0].status === 'fulfilled') {
                const d = results[0].value.data?.data || results[0].value.data || {};
                setSummary({
                    team_tasks: Number(d.team_tasks || d.total_tasks || 0),
                    in_progress_tasks: Number(d.in_progress_tasks || d.in_progress || 0),
                    pending_approval: Number(d.pending_approval || d.submitted_tasks || 0),
                    overdue_tasks: Number(d.overdue_tasks || d.overdue || 0)
                });
            }

            // 2. Department Metrics
            if (results[1].status === 'fulfilled') {
                const d = results[1].value.data?.data || results[1].value.data || {};
                setDeptMetrics({
                    total_tasks: Number(d.total_tasks || 0),
                    completed_tasks: Number(d.completed_tasks || 0),
                    submitted_tasks: Number(d.submitted_tasks || 0),
                    new_tasks: Number(d.new_tasks || 0),
                    overdue_tasks: Number(d.overdue_tasks || 0),
                    active_tasks: Number(d.active_tasks || 0),
                    completion_pct: Number(d.completion_pct || d.completion_percentage || 0)
                });
            }

            // 3. Trends
            if (results[2].status === 'fulfilled' && results[2].value.data?.data?.length > 0) {
                const trendData = (results[2].value.data?.data || []).map(t => ({
                    name: t.date || t.label || t.name,
                    new: t.new_tasks || t.new || 0,
                    pending: t.pending_approval || t.pending || 0,
                    overdue: t.overdue_tasks || t.overdue || 0
                }));
                setTrends(trendData);
            }

            // 4. Team Performance & All Employees Combine
            let allEmpBase = [];
            if (results[6].status === 'fulfilled' && Array.isArray(results[6].value.data)) {
                allEmpBase = results[6].value.data;
            } else if (results[6].status === 'fulfilled' && Array.isArray(results[6].value.data?.data)) {
                allEmpBase = results[6].value.data.data;
            }

            const perfSummaryData = (results[3].status === 'fulfilled' && results[3].value.data?.data) ? results[3].value.data.data : [];
            const riskSummaryData = (results[4].status === 'fulfilled' && results[4].value.data?.data) ? results[4].value.data.data : [];

            // CREATE A UNION OF ENTIRE TEAM (from Registry + Performance Summary)
            const idMap = new Map();
            allEmpBase.forEach(e => idMap.set(e.emp_id || e.id, { ...e, source: 'registry' }));
            perfSummaryData.forEach(e => {
                const id = e.emp_id || e.id;
                if (!idMap.has(id)) {
                    idMap.set(id, { ...e, source: 'summary' });
                } else {
                    idMap.set(id, { ...idMap.get(id), ...e }); // Merge summary onto registry base
                }
            });

            const unionTeam = Array.from(idMap.values());

            // Performance Merge
            const mergedPerformance = unionTeam.map(emp => ({
                emp_id: emp.emp_id || emp.id,
                name: emp.name,
                role: emp.role || 'Contributor',
                department: emp.department_name || emp.department || 'Accounts',
                tasks_assigned: emp.tasks_assigned || 0,
                in_progress: emp.in_progress || 0,
                pending_review: emp.pending_review || 0,
                overdue: emp.overdue || emp.overdue_tasks || 0,
                completion_rate: emp.completion_rate || emp.performance_score || 0
            })).sort((a,b) => (b.tasks_assigned || 0) - (a.tasks_assigned || 0));

            setTeamPerformance(mergedPerformance);

            // Risk Merge
            const mergedRisk = unionTeam.map(emp => {
                const risk = riskSummaryData.find(r => r.emp_id === emp.emp_id || r.name === emp.name) || {};
                const perf = mergedPerformance.find(p => p.emp_id === emp.emp_id || p.name === emp.name) || {};
                
                return {
                    emp_id: emp.emp_id || emp.id,
                    name: emp.name,
                    department: emp.department_name || emp.department || risk.department || 'Accounts',
                    active_tasks: risk.active_tasks || (perf.tasks_assigned - (perf.completed || 0)) || 0,
                    overdue_tasks: risk.overdue_tasks || perf.overdue || 0,
                    performance_score: risk.performance_score || perf.completion_rate || 0,
                    risk_status: risk.risk_status || (perf.overdue > 2 ? 'OFF_TRACK' : perf.overdue > 1 ? 'AT_RISK' : perf.overdue === 1 ? 'WATCH' : 'ON_TRACK')
                };
            }).sort((a,b) => (b.overdue_tasks || 0) - (a.overdue_tasks || 0));

            setEmployeeRisk(mergedRisk);

            // ─── AGGREGATE ALL SOURCES ───
            if (results[5].status === 'fulfilled') {
                const rawTasks = results[5].value.data?.data || results[5].value.data || [];
                const tasks = Array.isArray(rawTasks) ? rawTasks : (rawTasks.items || []);
                const activeTasks = tasks.filter(t => (t.status || '').toUpperCase() !== 'CANCELLED');

                if (activeTasks.length > 0) {
                    // Only compute metrics if we don't have a reliable team list from registry/summaries
                    if (perfSummaryData.length === 0 || mergedPerformance.every(p => !p.tasks_assigned || p.tasks_assigned === 0)) {
                        aggregateFallbackData(activeTasks, allEmpBase);
                    }
                }
            }

        } catch (err) {
            console.error('[CFO Dashboard] Error fetching reports:', err);
            toast.error('Could not sync some metrics.');
        } finally {
            setLoading(false);
            setIsInitialLoad(false);
        }
    }, [selectedDept, fromDate, toDate, summary.team_tasks, aggregateFallbackData]);

    useEffect(() => {
        if (isCFO) {
            api.get('/departments').then(res => {
                const depts = res.data?.data || res.data || [];
                setDepartments(depts);
                if (!selectedDept) setSelectedDept('all');
            }).catch(() => {
                if (!selectedDept) setSelectedDept('all');
            });
        } else {
            setSelectedDept(user?.department_id || user?.dept_id || 'all');
        }
    }, [isCFO, user, selectedDept]);

    useEffect(() => {
        const handleFilterChange = () => {
            setFromDate(localStorage.getItem('dashboard_from_date') || getFirstDayOfMonth());
            setToDate(localStorage.getItem('dashboard_to_date') || getToday());
        };
        window.addEventListener('dashboard-filter-change', handleFilterChange);
        return () => window.removeEventListener('dashboard-filter-change', handleFilterChange);
    }, []);

    useEffect(() => {
        fetchDashData();
    }, [fetchDashData]);

    const handleDateChange = (type, value) => {
        if (type === 'from') {
            setFromDate(value);
            localStorage.setItem('dashboard_from_date', value);
        } else {
            setToDate(value);
            localStorage.setItem('dashboard_to_date', value);
        }
        window.dispatchEvent(new CustomEvent('dashboard-filter-change'));
    };

    const currentDeptName = useMemo(() => {
        if (!selectedDept || selectedDept === 'all') return 'All Departments';
        const dept = departments.find(d => String(d.department_id || d.id) === String(selectedDept));
        return dept ? dept.name : (user?.department_name || user?.department || 'My Department');
    }, [selectedDept, departments, user]);
    const weeklyTrends = useMemo(() => {
        if (!trends || trends.length === 0) return [];
        const weeks = [];
        for (let i = 0; i < trends.length; i += 7) {
            const chunk = trends.slice(i, i + 7);
            weeks.push({
                name: chunk[0].name,
                new: chunk.reduce((sum, item) => sum + (item.new || 0), 0),
                pending: chunk.reduce((sum, item) => sum + (item.pending || 0), 0),
                overdue: chunk.reduce((sum, item) => sum + (item.overdue || 0), 0)
            });
        }
        return weeks;
    }, [trends]);

    if (loading && isInitialLoad) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-screen bg-[#F8FAFF]">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                    <Activity className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={24} />
                </div>
                <p className="mt-6 text-sm font-semibold text-slate-400 capitalize tracking-[0.2em] animate-pulse">Syncing Executive Data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFF] p-4 md:p-8 animate-in fade-in duration-700 selection:bg-indigo-100 selection:text-indigo-900">
            {/* ── HEADER & FILTERS ── */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-8 px-4 relative z-50">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="h-[2px] w-10 bg-indigo-600/40 rounded-full" />
                        <p className="text-indigo-600 text-[11px] font-medium tracking-[0.3em] uppercase">
                            {isCFO ? 'Executive dashboard' : 'Manager Dashboard'}
                        </p>
                    </div>
                    <h1 className="text-[34px] font-medium text-[#1E1B4B] tracking-tight leading-none mb-4 capitalize">
                        {isCFO ? 'Cross-department analytics' : 'Task Overview & Team Performance Tracking'}
                    </h1>
                    <div className="flex items-center gap-2.5 text-slate-500 font-medium text-[13px] bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl w-fit border border-white/60 shadow-sm">
                        <Building2 size={15} className="text-indigo-500/70" />
                        <span className="capitalize">Viewing: <span className="text-indigo-600 font-medium">{currentDeptName}</span></span>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 bg-white/60 backdrop-blur-2xl p-3 rounded-[2rem] border border-white shadow-xl shadow-indigo-100/20">
                    {isCFO && (
                        <div className="flex flex-col px-5 py-2 min-w-[220px] group">
                            <p className="text-[10px] font-medium text-slate-400 capitalize tracking-widest leading-none mb-2">Department view</p>
                            <div className="flex items-center gap-3">
                                <Layout size={16} className="text-indigo-500/50" />
                                <CustomSelect
                                    options={[
                                        { label: 'All Departments', value: 'all' },
                                        ...departments.map(d => ({ label: d.name, value: d.department_id || d.id }))
                                    ]}
                                    value={selectedDept}
                                    onChange={setSelectedDept}
                                    className="!border-none !shadow-none !bg-transparent !p-0 !text-[#1E1B4B] font-medium text-[13px] capitalize"
                                />
                            </div>
                        </div>
                    )}
                    <div className="h-10 w-px bg-slate-200 hidden md:block" />
                    <div className="flex items-center gap-2 px-2">
                        <div className="flex flex-col">
                             <span className="text-[9px] font-medium text-slate-400 capitalize tracking-widest mb-1.5 ml-1">Period starts</span>
                             <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50">
                                <Calendar size={14} className="text-slate-400" />
                                <input 
                                    type="date" 
                                    className="bg-transparent border-none text-[11px] font-medium text-[#1E1B4B] focus:ring-0 p-0 cursor-pointer"
                                    value={fromDate}
                                    onChange={(e) => handleDateChange('from', e.target.value)}
                                />
                             </div>
                        </div>
                        <div className="mt-5 text-slate-300 mx-1">
                            <ArrowRight size={14} />
                        </div>
                        <div className="flex flex-col">
                             <span className="text-[9px] font-medium text-slate-400 capitalize tracking-widest mb-1.5 ml-1">Period ends</span>
                             <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50">
                                <Calendar size={14} className="text-slate-400" />
                                <input 
                                    type="date" 
                                    className="bg-transparent border-none text-[11px] font-medium text-[#1E1B4B] focus:ring-0 p-0 cursor-pointer"
                                    value={toDate}
                                    onChange={(e) => handleDateChange('to', e.target.value)}
                                />
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── KPI SUMMARY CARDS (5 COLORFUL CARDS) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5 mb-10 px-4">
                {/* 1. TEAM TASKS - INDIGO */}
                <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#6366F1] to-[#4F46E5] p-6 shadow-xl shadow-indigo-200/50 transition-all duration-500 hover:scale-[1.03] hover:shadow-indigo-300/40">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <Briefcase size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                             <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-1">Team tasks</p>
                             <h4 className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">
                                {summary?.team_tasks || 0}
                             </h4>
                        </div>
                    </div>
                </div>

                {/* 2. IN PROGRESS - SKY */}
                <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] p-6 shadow-xl shadow-sky-200/50 transition-all duration-500 hover:scale-[1.03] hover:shadow-sky-300/40">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <Activity size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                             <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-1">In progress</p>
                             <h4 className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">
                                {summary?.in_progress_tasks || 0}
                             </h4>
                        </div>
                    </div>
                </div>

                {/* 3. PENDING REVIEW - AMBER */}
                <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#F59E0B] to-[#D97706] p-6 shadow-xl shadow-amber-100/50 transition-all duration-500 hover:scale-[1.03] hover:shadow-amber-200/40">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <Clock size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                             <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-1">Pending review</p>
                             <h4 className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">
                                {summary?.pending_approval || 0}
                             </h4>
                        </div>
                    </div>
                </div>

                {/* 4. OVERDUE TASKS - ROSE */}
                <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#F43F5E] to-[#E11D48] p-6 shadow-xl shadow-rose-200/50 transition-all duration-500 hover:scale-[1.03] hover:shadow-rose-300/40">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <AlertCircle size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                             <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-1">Overdue tasks</p>
                             <h4 className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">
                                {summary?.overdue_tasks || 0}
                             </h4>
                        </div>
                    </div>
                </div>

                {/* 5. PERFORMANCE % - EMERALD */}
                <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#10B981] to-[#059669] p-6 shadow-xl shadow-emerald-200/50 transition-all duration-500 hover:scale-[1.03] hover:shadow-emerald-300/40">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <Target size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                             <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-1">Efficiency index</p>
                             <h4 className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">
                                {deptMetrics?.completion_pct || 0}%
                             </h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT GRID ── */}
            <div className="flex flex-col gap-6 px-4 mb-20">
                {/* ROW 1: Trend & Dept Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-2">
                    {/* Task Activity Trend */}
                    <div className="lg:col-span-8 bg-white/70 backdrop-blur-md border border-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] p-8 h-[480px] flex flex-col relative group transition-all hover:bg-white/90">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-medium text-[#1E1B4B] capitalize">Task activity trends</h3>
                                    <p className="text-[12px] text-slate-400 font-medium capitalize tracking-[0.2em] mt-1 opacity-70">Dynamic workload trajectory</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 px-5 py-2.5 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="text-[9px] font-medium text-slate-500 capitalize tracking-tighter">New</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-[9px] font-medium text-slate-500 capitalize tracking-tighter">Pending</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                    <span className="text-[9px] font-medium text-slate-500 capitalize tracking-tighter">Overdue</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-0 -ml-4 pr-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#E2E8F0" opacity={0.4} />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fontSize: 10, fontWeight: '500', fill: '#94A3B8'}}
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fontSize: 10, fontWeight: '500', fill: '#94A3B8'}}
                                    />
                                    <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#F43F5E" radius={[0, 0, 0, 0]} barSize={24} />
                                    <Bar dataKey="pending" name="Pending Review" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} barSize={24} />
                                    <Bar dataKey="new" name="New Tasks" stackId="a" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Department Performance Widget */}
                    <div className="lg:col-span-4 bg-white/70 backdrop-blur-md border border-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] p-8 flex flex-col items-center h-[480px] transition-all hover:bg-white/90">
                        <div className="w-full mb-6 text-center">
                             <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full mb-3">
                                <Activity size={12} className="text-indigo-600/70" />
                                <span className="text-[10px] font-medium text-indigo-600 capitalize tracking-[0.2em] mt-0.5">Efficiency index</span>
                             </div>
                             <h3 className="text-xl font-medium text-[#1E1B4B] capitalize">Department health</h3>
                        </div>

                        <div className="relative w-full aspect-square max-w-[190px] flex items-center justify-center mb-6">
                            {(deptMetrics?.completed_tasks || 0) === 0 && (deptMetrics?.submitted_tasks || 0) === 0 && (deptMetrics?.new_tasks || 0) === 0 && (deptMetrics?.active_tasks || 0) === 0 && (deptMetrics?.overdue_tasks || 0) === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                     <div className="w-16 h-16 rounded-full border-4 border-slate-100 flex items-center justify-center mb-4">
                                        <Activity size={20} className="text-slate-300" />
                                     </div>
                                    <span className="text-[10px] font-bold text-slate-400 capitalize tracking-[0.2em] leading-relaxed text-center">No department activity available</span>
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Completed', value: deptMetrics?.completed_tasks || 0 },
                                                    { name: 'Submitted', value: deptMetrics?.submitted_tasks || 0 },
                                                    { name: 'New', value: deptMetrics?.new_tasks || 0 },
                                                    { name: 'Active', value: (deptMetrics?.active_tasks || 0) },
                                                    { name: 'Overdue', value: deptMetrics?.overdue_tasks || 0 }
                                                ].filter(d => d.value > 0)}
                                                innerRadius={55}
                                                outerRadius={75}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#10B981" />
                                                <Cell fill="#F59E0B" />
                                                <Cell fill="#3B82F6" />
                                                <Cell fill="#8B5CF6" />
                                                <Cell fill="#F43F5E" />
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-3xl font-medium text-[#1E1B4B] leading-none mb-1 tracking-tighter">
                                            {Math.round(deptMetrics?.completion_pct || 0)}%
                                        </span>
                                        <span className="text-[9px] font-medium text-slate-400 capitalize tracking-widest opacity-60">Completion</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                             <div className="flex flex-col p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
                                <span className="text-[9px] font-medium text-blue-600 capitalize tracking-widest mb-1 opacity-60">New</span>
                                <span className="text-lg font-medium text-blue-700 leading-none">{deptMetrics?.new_tasks || 0}</span>
                             </div>
                             <div className="flex flex-col p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                <span className="text-[9px] font-medium text-emerald-600 capitalize tracking-widest mb-1 opacity-60">Done</span>
                                <span className="text-lg font-medium text-emerald-700 leading-none">{deptMetrics?.completed_tasks || 0}</span>
                             </div>
                             <div className="flex flex-col p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                                <span className="text-[9px] font-medium text-amber-600 capitalize tracking-widest mb-1 opacity-60">Submitted</span>
                                <span className="text-lg font-medium text-amber-700 leading-none">{deptMetrics?.submitted_tasks || 0}</span>
                             </div>
                             <div className="flex flex-col p-2.5 rounded-xl bg-rose-50/50 border border-rose-100">
                                <span className="text-[9px] font-medium text-rose-600 capitalize tracking-widest mb-1 opacity-60">Overdue</span>
                                <span className="text-lg font-medium text-rose-700 leading-none">{deptMetrics?.overdue_tasks || 0}</span>
                             </div>
                        </div>

                        <button onClick={() => navigate('/tasks')} className="w-full mt-auto py-4 bg-[#1E1B4B] text-white rounded-2xl font-medium text-[11px] capitalize tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-black hover:translate-y-[-2px] transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                            Deep Analysis
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* ROW 2: Team Performance & Risk Monitor */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-10">
                    <div className="lg:col-span-8 bg-white/70 backdrop-blur-md border border-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden transition-all hover:bg-white/90">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-medium text-[#1E1B4B] capitalize">Team performance monitor</h3>
                                    <p className="text-[12px] text-slate-400 font-medium capitalize tracking-[0.2em] mt-1 opacity-70">Direct contributor metrics</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowTeamModal(true)} 
                                className="text-indigo-600 hover:text-indigo-800 text-[10px] font-medium capitalize tracking-widest flex items-center gap-2 group p-2 hover:bg-indigo-50 rounded-xl transition-all"
                            >
                                View Detailed
                                <ExternalLink size={14} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#FAF9FF]/80 backdrop-blur-sm sticky top-0 z-10">
                                    <tr className="border-b border-indigo-50">
                                        <th className="py-5 px-10 text-[10px] font-medium text-[#4B447A] capitalize tracking-[0.2em]">Employee</th>
                                        {isCFO && <th className="py-5 px-4 text-[10px] font-medium text-[#4B447A] capitalize tracking-[0.2em]">Department</th>}
                                        <th className="py-5 px-4 text-[10px] font-medium text-[#4B447A] capitalize tracking-[0.2em] text-center">Tasks</th>
                                        <th className="py-5 px-4 text-[10px] font-medium text-[#4B447A] capitalize tracking-[0.2em] text-center">Active</th>
                                        <th className="py-5 px-4 text-[10px] font-medium text-[#4B447A] capitalize tracking-[0.2em] text-center">Pending</th>
                                        <th className="py-5 px-4 text-[10px] font-medium text-[#4B447A] capitalize tracking-[0.2em] text-center text-rose-500">Overdue</th>
                                        <th className="py-5 px-8 text-[10px] font-medium text-[#4B447A] capitalize tracking-[0.2em] text-right">Completion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {teamPerformance.length === 0 ? (
                                        <tr>
                                            <td colSpan={isCFO ? 7 : 6} className="py-12 bg-slate-50/30 text-center">
                                                <span className="text-[12px] font-bold text-slate-400 capitalize tracking-[0.2em]">No team task data available</span>
                                            </td>
                                        </tr>
                                    ) : teamPerformance.slice((teamPage - 1) * teamItemsPerPage, teamPage * teamItemsPerPage).map((emp, i) => (
                                        <tr key={i} className="group hover:bg-white/60 transition-all duration-300 border-none">
                                            <td className="py-5 px-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-white shadow-sm flex items-center justify-center font-medium text-indigo-600 text-[11px] group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:scale-110">
                                                        {getInitials(emp.name)}
                                                    </div>
                                                    <div>
                                                        <div className="text-[14px] font-medium text-[#1E1B4B] group-hover:text-indigo-600 transition-colors capitalize">{emp.name}</div>
                                                        <div className="text-[10px] font-medium text-slate-400 capitalize tracking-tighter mt-0.5">{emp.role || 'Contributor'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {isCFO && (
                                                <td className="py-5 px-4">
                                                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100/50 px-2.5 py-1 rounded-lg capitalize tracking-tight">
                                                        {emp.department || emp.dept_name || 'Accounts'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="py-5 px-4 text-center font-medium text-[#1E1B4B] tabular-nums">{emp.tasks_assigned || 0}</td>
                                            <td className="py-5 px-4 text-center font-medium text-indigo-600 tabular-nums">{emp.in_progress || 0}</td>
                                            <td className="py-5 px-4 text-center font-medium text-amber-600 tabular-nums">{emp.pending_review || 0}</td>
                                            <td className="py-5 px-4 text-center font-medium text-rose-600 tabular-nums">{emp.overdue || 0}</td>
                                            <td className="py-5 px-8">
                                                <div className="flex items-center justify-end gap-4">
                                                    <div className="flex-1 max-w-[100px] h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-1000 ${
                                                                (emp.completion_rate || 0) >= 80 ? 'bg-[#10B981]' : 
                                                                (emp.completion_rate || 0) >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                                                            }`} 
                                                            style={{ width: `${emp.completion_rate || 0}%` }} 
                                                        />
                                                    </div>
                                                    <span className="text-[15px] font-medium text-[#2D2852] tabular-nums">{emp.completion_rate || 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-10 py-6 border-t border-slate-50 flex items-center justify-center bg-slate-50/10 mt-auto">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setTeamPage(prev => Math.max(1, prev - 1))}
                                    disabled={teamPage === 1}
                                    className="p-2.5 rounded-xl bg-white shadow-sm text-slate-400 hover:text-indigo-600 transition-all hover:translate-x-[-2px] disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-2">
                                     {[...Array(Math.ceil(teamPerformance.length / teamItemsPerPage))].map((_, i) => (
                                        <div 
                                            key={i}
                                            onClick={() => setTeamPage(i + 1)}
                                            className={`w-9 h-9 flex items-center justify-center rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                                                teamPage === i + 1 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                                : 'bg-white text-slate-400 hover:text-indigo-600'
                                            }`}
                                        >
                                            {i + 1}
                                        </div>
                                     ))}
                                </div>
                                <button 
                                    onClick={() => setTeamPage(prev => Math.min(Math.ceil(teamPerformance.length / teamItemsPerPage), prev + 1))}
                                    disabled={teamPage === Math.ceil(teamPerformance.length / teamItemsPerPage)}
                                    className="p-2.5 rounded-xl bg-white shadow-sm text-slate-400 hover:text-indigo-600 transition-all hover:translate-x-[2px] disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 bg-white/80 border border-white rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.02)] px-6 py-10 flex flex-col min-h-[500px] h-full">
                        <div className="flex items-center justify-between mb-8">
                             <h3 className="text-[18px] font-medium text-[#2D2852] flex items-center gap-3">
                                <AlertTriangle size={20} className="text-rose-500" />
                                Employee Risk Monitor
                             </h3>
                             <button onClick={() => setShowRiskModal(true)} className="text-[11px] font-medium text-indigo-600 capitalize tracking-widest hover:underline">View All</button>
                        </div>

                        <div className="grid grid-cols-12 gap-2 px-2 py-3 mb-2 text-[10px] font-medium text-slate-400 capitalize tracking-widest border-b border-slate-50">
                            <div className="col-span-6">Employee</div>
                            <div className="col-span-1 text-center">Act</div>
                            <div className="col-span-2 text-center">Score</div>
                            <div className="col-span-3 text-right">Status</div>
                        </div>
                        
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {employeeRisk.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-12">
                                    <span className="text-[12px] font-bold text-slate-400 capitalize tracking-[0.2em] text-center">No employee risks detected</span>
                                </div>
                            ) : employeeRisk.filter(emp => emp.name !== user?.name).slice(0, 5).map((emp, i) => {
                                const statusCfg = ({
                                    'ON_TRACK': { label: 'Perfect..', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
                                    'WATCH': { label: 'Monitor', bg: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' },
                                    'AT_RISK': { label: 'Action', bg: 'bg-rose-50 text-rose-600 border-rose-100', dot: 'bg-rose-500' },
                                    'OFF_TRACK': { label: 'Off track', bg: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-600' }
                                }[emp.risk_status?.toUpperCase() || (emp.overdue_tasks > 1 ? 'AT_RISK' : emp.overdue_tasks === 1 ? 'WATCH' : 'ON_TRACK')]) || { label: 'Monitor', bg: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' };

                                return (
                                    <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 bg-white/40 border border-white/50 rounded-2xl hover:bg-white transition-all shadow-sm hover:translate-x-1 duration-300">
                                        <div className="col-span-6 flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-white shadow-sm flex items-center justify-center font-medium text-[#1E1B4B] text-[10px] shrink-0">
                                                {getInitials(emp.name)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <p className="text-[12px] font-bold text-[#1E1B4B] truncate leading-none mb-1">{emp.name}</p>
                                                 <p className="text-[9px] font-medium text-slate-400 capitalize tracking-widest truncate">{emp.department || 'Accounts'}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-1 text-center text-[12px] font-bold text-slate-700 tabular-nums">{emp.active_tasks ?? 0}</div>
                                        <div className="col-span-2 text-center text-[12px] font-bold text-slate-900 tabular-nums tracking-tighter">{Math.round(emp.performance_score ?? 0)}%</div>
                                        <div className="col-span-3 text-right">
                                            <div className={`px-2 py-1 rounded-lg border ${statusCfg.bg} text-[9px] font-bold capitalize tracking-tighter flex items-center gap-1.5 justify-center w-full`}>
                                                <span className={`w-1 h-1 rounded-full ${statusCfg.dot} animate-pulse`} />
                                                {statusCfg.label}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-auto pt-6 border-t border-slate-50 flex flex-wrap gap-x-6 gap-y-3">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-600" />
                                <span className="text-[10px] font-medium text-slate-400 tracking-wider capitalize">Off Track: Critical</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-400" />
                                <span className="text-[10px] font-medium text-slate-400 tracking-wider capitalize">At Risk: Action</span>
                             </div>
                             <div className="flex items-center gap-2 group cursor-help relative">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-[10px] font-medium text-slate-400 tracking-wider capitalize">Watch: Monitor</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-medium text-slate-400 tracking-wider capitalize">On Track: Perfect..</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showRiskModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-white">
                        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-medium text-[#2D2852]">Full Employee Risk List</h3>
                                <p className="text-sm text-slate-400 font-medium mt-1">Comprehensive risk monitoring for {currentDeptName}</p>
                            </div>
                            <button onClick={() => setShowRiskModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all">
                                <Plus size={24} className="rotate-45 text-slate-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                            <table className="w-full text-left font-medium">
                                <thead className="bg-[#FAF9FF] text-[11px] font-medium text-slate-400 capitalize tracking-widest border-b border-slate-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="py-5 px-10">Employee</th>
                                        <th className="py-5 px-4 text-center">Act</th>
                                        <th className="py-5 px-4 text-center">Overdue</th>
                                        <th className="py-5 px-4 text-center">Score</th>
                                        <th className="py-5 px-10 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {employeeRisk.map((emp, i) => {
                                        const statusCfg = ({
                                            'ON_TRACK': { label: 'Perfect..', bg: 'bg-emerald-500', text: 'text-white' },
                                            'WATCH': { label: 'Monitor', bg: 'bg-amber-500', text: 'text-white' },
                                            'AT_RISK': { label: 'Action', bg: 'bg-rose-500', text: 'text-white' },
                                            'OFF_TRACK': { label: 'Off track', bg: 'bg-rose-700', text: 'text-white' }
                                        }[emp.risk_status?.toUpperCase()]) || { label: 'Monitor', bg: 'bg-amber-500', text: 'text-white' };

                                        return (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-5 px-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-white shadow-sm flex items-center justify-center font-medium text-[#2D2852] text-[10px]">
                                                            {getInitials(emp.name)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-[#2D2852] capitalize">{emp.name}</div>
                                                             <div className="text-[10px] text-slate-400 font-medium capitalize tracking-widest leading-none mt-1">{emp.department || 'Accounts'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4 text-center text-sm font-medium text-slate-700 tabular-nums">{emp.active_tasks || 0}</td>
                                                <td className="py-5 px-4 text-center text-sm font-medium text-rose-600 tabular-nums">{emp.overdue_tasks || 0}</td>
                                                <td className="py-5 px-4 text-center text-sm font-medium text-[#2D2852] tabular-nums">{Math.round(emp.performance_score || 0)}%</td>
                                                <td className="py-5 px-10 text-right">
                                                    <span className={`inline-block px-3 py-1 rounded-2xl text-[10px] font-medium ${statusCfg.bg} text-white shadow-sm capitalize tracking-widest`}>
                                                        {statusCfg.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {showTeamModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-white">
                        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-medium text-[#2D2852] capitalize">Complete team performance</h3>
                                <p className="text-sm text-slate-400 font-medium mt-1 capitalize tracking-widest">Detailed productivity breakdown for {currentDeptName}</p>
                            </div>
                            <button onClick={() => setShowTeamModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all">
                                <Plus size={24} className="rotate-45 text-slate-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-x-auto custom-scrollbar p-6">
                            <table className="w-full text-left font-medium">
                                <thead className="bg-[#FAF9FF] text-[11px] font-medium text-slate-400 tracking-[0.2em] border-b border-slate-100 capitalize">
                                    <tr>
                                        <th className="py-5 px-8">Employee</th>
                                        <th className="py-5 px-4 text-center">Tasks</th>
                                        <th className="py-5 px-4 text-center">Active</th>
                                        <th className="py-5 px-4 text-center">Pending</th>
                                        <th className="py-5 px-4 text-center text-rose-500">Overdue</th>
                                        <th className="py-5 px-8 text-right">Completion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 capitalize">
                                    {teamPerformance.map((emp, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-white shadow-sm flex items-center justify-center font-medium text-[#2D2852] text-[10px]">
                                                         {getInitials(emp.name)}
                                                     </div>
                                                     <span className="text-sm font-medium text-[#2D2852]">{emp.name}</span>
                                                 </div>
                                             </td>
                                             <td className="py-5 px-4 text-center text-sm font-medium text-slate-600 tabular-nums">{emp.tasks_assigned || 0}</td>
                                             <td className="py-5 px-4 text-center text-sm font-medium text-indigo-600 tabular-nums">{emp.in_progress || 0}</td>
                                             <td className="py-5 px-4 text-center text-sm font-medium text-amber-600 tabular-nums">{emp.pending_review || 0}</td>
                                             <td className="py-5 px-4 text-center text-sm font-medium text-rose-600 tabular-nums">{emp.overdue || 0}</td>
                                             <td className="py-5 px-8">
                                                <div className="flex items-center justify-end gap-3 font-medium">
                                                    <span className="text-sm text-[#2D2852] tabular-nums">{emp.completion_rate || 0}%</span>
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${
                                                                (emp.completion_rate || 0) >= 80 ? 'bg-emerald-500' : 
                                                                (emp.completion_rate || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`}
                                                            style={{ width: `${emp.completion_rate || 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceDashboard;
