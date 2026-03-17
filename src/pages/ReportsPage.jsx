import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getEmployeeRankings } from '../utils/rankingEngine';
import ChartPanel from '../components/Charts/ChartPanel';
import { Download, FileSpreadsheet, TrendingUp, TrendingDown, Calendar, ArrowRight, CheckSquare, BarChart2, Activity, Users, ClipboardCheck, Play, Upload, AlertTriangle, Trophy, AlertCircle, Building2, Landmark, HandCoins } from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    LineChart, Line, ComposedChart, Area, Cell, PieChart, Pie
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

const getFirstDayOfMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const getToday = () => {
    return new Date().toISOString().slice(0, 10);
};

const inRange = (dateKey, fromDate, toDate) => {
    if (!dateKey) return !fromDate && !toDate;
    if (fromDate && dateKey < fromDate) return false;
    if (toDate && dateKey > toDate) return false;
    return true;
};


const TaskDistributionCard = ({ data, title = "Task Distribution" }) => {
    if (!data || Object.keys(data).length === 0) return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-8 text-center h-[350px] flex flex-col items-center justify-center">
            <Activity className="w-10 h-10 text-indigo-200 mb-4 animate-pulse" />
            <p className="text-slate-400 font-medium capitalize tracking-widest text-[11px]">Syncing Distribution Analysis...</p>
        </div>
    );

    const COLORS = {
        'New': '#3b82f6',
        'In Progress': '#6366f1',
        'Submitted': '#f59e0b',
        'Approved': '#10b981',
        'Rework': '#ea580c',
        'Overdue': '#ef4444',
        'Cancelled': '#94a3b8'
    };

    const statusMap = [
        { key: 'new_tasks', name: 'New', color: COLORS['New'] },
        { key: 'in_progress_tasks', name: 'In Progress', color: COLORS['In Progress'] },
        { key: 'submitted_tasks', name: 'Submitted', color: COLORS['Submitted'] },
        { key: 'approved_tasks', name: 'Approved', color: COLORS['Approved'] },
        { key: 'rework_tasks', name: 'Rework', color: COLORS['Rework'] },
        { key: 'overdue_tasks', name: 'Overdue', color: COLORS['Overdue'] }
    ];

    const allStatusData = statusMap.map(s => {
        let val = data[s.key] || 0;
        if (s.name === 'Approved' && val === 0) val = data.completed_tasks || 0;
        if (s.name === 'Rework' && val === 0) val = data.rework_count || 0;
        return { name: s.name, value: val, color: s.color };
    });

    const displayDataForPie = allStatusData.filter(d => d.value > 0);
    const grandTotal = allStatusData.reduce((acc, d) => acc + d.value, 0) || 0;

    return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-8 transition-all hover:shadow-xl hover:shadow-indigo-500/5 group">
            <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                    <h3 className="text-[20px] font-semibold text-slate-800 flex items-center gap-2.5 tracking-tight">
                        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                           <BarChart2 size={18} strokeWidth={2.5} />
                        </div>
                        {title}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] pl-10">Tasks Status Analysis</p>
                </div>
                <div className="px-5 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-semibold text-slate-600 shadow-inner">
                    Total: <span className="text-indigo-600 font-bold tabular-nums">{grandTotal}</span>
                </div>
            </div>
            
            <div className="flex flex-col xl:flex-row items-center gap-12">
                {/* Modern Circle Diagram */}
                <div className="relative w-56 h-56 shrink-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-indigo-50/20 rounded-full blur-2xl group-hover:bg-indigo-100/30 transition-colors duration-700" />
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={displayDataForPie.length > 0 ? displayDataForPie : [{ name: 'Empty', value: 1, color: '#f1f5f9' }]}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={105}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                                animationBegin={0}
                                animationDuration={1000}
                            >
                                {(displayDataForPie.length > 0 ? displayDataForPie : [{ name: 'Empty', value: 1, color: '#f1f5f9' }]).map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.color} 
                                        style={entry.name !== 'Empty' ? { filter: `drop-shadow(0 4px 6px ${entry.color}33)` } : {}}
                                    />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontSize: '12px', padding: '12px 16px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase opacity-60 mb-1">Impact</span>
                        <div className="flex items-baseline gap-1">
                             <span className="text-[42px] font-black text-slate-800 tabular-nums leading-none tracking-tighter">
                                {grandTotal}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500/60 uppercase mt-1">Tasks</span>
                    </div>
                </div>

                {/* Structured Legend with Metadata - Showing all statuses for completeness */}
                <div className="flex-1 w-full space-y-3">
                    {allStatusData.map((item, idx) => {
                        const pct = grandTotal > 0 ? Math.round((item.value / grandTotal) * 100) : 0;
                        return (
                            <div key={idx} className={`bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl p-4 transition-all duration-300 group/item ${item.value === 0 ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                                        <span className="text-[14px] font-bold text-slate-700 capitalize">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[12px] font-semibold text-slate-400 tabular-nums">{item.value} Tasks</span>
                                        <span className="text-[16px] font-black text-slate-900 tabular-nums">{pct}%</span>
                                    </div>
                                </div>
                                {/* Visual Progress Bar */}
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]"
                                        style={{ 
                                            backgroundColor: item.color, 
                                            width: `${pct}%`,
                                            opacity: item.value > 0 ? 0.8 : 0.2
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
const fetchTasksForReports = async (isCFO) => {
    const baseURL = api.defaults.baseURL || '';
    const token = localStorage.getItem('pms_token');
    const candidates = isCFO
        ? ['/tasks', '/tasks?scope=org', '/tasks?scope=all']
        : ['/tasks', '/tasks?scope=department', '/tasks?scope=mine'];

    for (const path of candidates) {
        try {
            const res = await api.get(path);
            const data = res.data;
            const rows = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            if (rows.length > 0) return rows;
        } catch (_) {
            // try next candidate
        }
    }
    return [];
};

const ReportsPage = () => {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        employeeId: '',
        departmentId: '',
        fromDate: getFirstDayOfMonth(),
        toDate: getToday()
    });

    const [availableDepartments, setAvailableDepartments] = useState([]);
    const [availableEmployees, setAvailableEmployees] = useState([]);

    const role = (user?.role || '').toUpperCase();
    const isCFO = role === 'CFO' || role === 'ADMIN';
    const isManager = role === 'MANAGER';
    const isEmployee = role === 'EMPLOYEE';

    const [reportData, setReportData] = useState(null);
    const [globalReportData, setGlobalReportData] = useState([]); // Unfiltered by Dept/Emp
    const [loading, setLoading] = useState(false);

    // New states for specialized Employee Reports
    const [employeeSummary, setEmployeeSummary] = useState(null);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [topPerformer, setTopPerformer] = useState(null);
    const [cfoTopEmployees, setCfoTopEmployees] = useState([]);
    const [deptTopPerformers, setDeptTopPerformers] = useState({});

    const fetchReportData = async () => {
        setLoading(true);
        try {

            let endpoint = '/dashboard/employee';
            if (isCFO) endpoint = '/dashboard/cfo';
            else if (isManager) endpoint = '/manager/reports';

            const start_date = filters.fromDate;
            const end_date = filters.toDate;

            const params = {};
            if (start_date) {
                params.start_date = start_date;
                params.from_date = start_date;
            }
            if (end_date) {
                params.end_date = end_date;
                params.to_date = end_date;
            }
            if (filters.employeeId) params.employee_id = filters.employeeId;
            if (filters.departmentId) params.department_id = filters.departmentId;

            // Fetch specialized Employee details if specific employee is filtered (any role)
            if (filters.employeeId || isEmployee) {
                try {
                    const fetchParams = { 
                        from_date: start_date || undefined, 
                        to_date: end_date || undefined,
                        employee_id: filters.employeeId || undefined
                    };

                    const [summaryRes, trendRes, topRes] = await Promise.all([
                        api.get('/reports/employee/summary', { params: fetchParams }),
                        api.get('/reports/employee/monthly-trend', { params: { ...fetchParams, months: 6 } }),
                        api.get('/reports/employee/department-top-performer', { params: fetchParams })
                    ]);
                    
                    const summary = summaryRes.data?.data || summaryRes.data || {};
                    const trend = trendRes.data?.data || trendRes.data || [];
                    const top = topRes.data?.data || topRes.data;

                    setEmployeeSummary(summary);
                    setMonthlyTrend(trend);
                    setTopPerformer(top);

                    if (isEmployee || filters.employeeId) {
                        // Map summary to the standard reportData format to keep table functioning
                        const currentEmp = availableEmployees.find(e => String(e.id || e.emp_id) === String(filters.employeeId)) || user;
                        const standardRow = [{
                            emp_id: filters.employeeId || user?.id,
                            name: currentEmp?.name || 'Me',
                            department: currentEmp?.department || user?.department || 'Personnel',
                            total_tasks: summary.total_tasks || 0,
                            approved_tasks: summary.completed_tasks || summary.approved_tasks || 0,
                            pending_tasks: (summary.total_tasks - (summary.completed_tasks || summary.approved_tasks || 0)) || 0,
                            performance_index: summary.score || summary.performance_index || 0,
                            avg_reworks: summary.rework_count || 0,
                            overdue_tasks: summary.overdue_tasks || 0,
                            new_tasks: summary.new_tasks || 0,
                            in_progress_tasks: summary.in_progress_tasks || 0,
                            submitted_tasks: summary.submitted_tasks || 0,
                            rework_tasks: summary.rework_count || 0,
                        }];
                        // We populate specialized states but DON'T return early,
                        // allowing fallback to fetch broader department/org tasks if possible.
                        if (isEmployee) {
                            setReportData(standardRow);
                            // We don't return here so fallback can populate globalReportData/topList
                        }
                    }
                } catch (err) {
                    console.warn("Individual reports fetch failed:", err);
                }
            }

            const response = await api.get(endpoint, { params });
            const data = response.data;
            const payload = data?.data || data;

            if (isCFO && payload.top_5_employees && payload.top_5_employees.length > 0) {
                const topListWithFullStats = [...payload.top_5_employees];
                setCfoTopEmployees(topListWithFullStats);
                
                // Proactively fetch real stats for the absolute top person if they're missing
                const t = topListWithFullStats[0];
                if (t && (t.emp_id || t.id)) {
                    try {
                        const sRes = await api.get('/reports/employee/summary', { 
                            params: { 
                                employee_id: t.emp_id || t.id,
                                from_date: start_date || undefined,
                                to_date: end_date || undefined
                            } 
                        });
                        const sData = sRes.data?.data || sRes.data;
                        if (sData) {
                            // Merge into the top employee object without overwriting with zeros
                            const total = sData.total_tasks || t.total_tasks || t.tasks_count || t.total || 0;
                            const completed = sData.completed_tasks || sData.approved_tasks || t.completed_tasks || t.approved_tasks || t.completed || 0;
                            const pending = (sData.total_tasks > 0) 
                                ? Math.max(0, sData.total_tasks - completed) 
                                : Math.max(0, t.pending_tasks || t.pending || (total - completed));
                                
                            const enriched = { 
                                ...t, 
                                total_tasks: total, 
                                approved_tasks: completed,
                                completed: completed,
                                pending: pending,
                                overdue_tasks: sData.overdue_tasks || t.overdue_tasks || t.overdue || 0,
                                rework_tasks: sData.rework_count || sData.rework_tasks || t.rework_tasks || t.rework || t.avg_reworks || 0
                            };
                            topListWithFullStats[0] = enriched;
                            setCfoTopEmployees([...topListWithFullStats]);
                            // Also set it as the primary top performer state for the main card
                            setTopPerformer(enriched);
                        }
                    } catch (e) {
                         console.warn("Failed to enrich top performer stats:", e);
                    }
                }
            }

            // Comprehensive stat extraction
            // Handle single object (Employee/Dashboard) or array (CFO/Manager)
            let stats = payload?.department_stats
                || payload?.manager_stats
                || payload?.performance_data
                || payload?.team_stats
                || payload?.stats;

            // If payload itself looks like an individual's stats (for Employee)
            if (!stats && payload?.performance_index !== undefined) {
                stats = [{
                    emp_id: user?.id,
                    name: user?.name || 'Me',
                    department: user?.department || 'My Unit',
                    total_tasks: payload.total_tasks || payload.tasks_count || 0,
                    approved_tasks: payload.approved_tasks || payload.tasks_completed || 0,
                    pending_tasks: payload.pending_tasks || 0,
                    performance_index: payload.performance_index || 0,
                    avg_reworks: payload.avg_reworks || 0
                }];
            }

            if (!stats) stats = (Array.isArray(payload) ? payload : (payload?.items || []));

            if (Array.isArray(stats) && stats.length > 0) {
                const BASE_DEPTS = ['Fixed Assets', 'Accounts Payables', 'Accounts Receivables', 'Treasury', 'MIS Report'];
                
                if (isCFO && !filters.employeeId && !filters.departmentId) {
                    const mergedGlobal = new Map();
                    
                    // Seed with BASE_DEPTS + availableDepartments
                    const allKnownDepts = new Set([
                        ...BASE_DEPTS,
                        ...availableDepartments.map(d => typeof d === 'string' ? d : (d.name || d.department_id))
                    ]);

                    allKnownDepts.forEach(name => {
                        mergedGlobal.set(name, {
                            name,
                            department_id: name,
                            total_tasks: 0,
                            approved_tasks: 0,
                            performance_index: 0,
                            on_time_pct: 0
                        });
                    });

                    // Overwrite/Add with real data from API
                    stats.forEach(s => {
                        const key = s.name || s.department_name || s.department_id || 'N/A';
                        const existing = mergedGlobal.get(key) || {};
                        mergedGlobal.set(key, { ...existing, ...s });
                    });

                    setGlobalReportData(Array.from(mergedGlobal.values()));
                } else {
                    if (!filters.employeeId && !filters.departmentId) {
                        setGlobalReportData(stats);
                    }
                }
                
                setReportData(stats);
                
                // Even if we have stats, try to populate deptTopPerformers if it's currently empty
                if (isCFO && Object.keys(deptTopPerformers).length === 0) {
                    const topP = {};
                    stats.forEach(s => {
                        const score = Math.round(s.performance_index || s.score || 0);
                        const currentId = s.emp_id || s.id;
                        if (currentId) {
                            const dName = s.department || s.department_name || 'N/A';
                            if (!topP[dName] || score > (topP[dName].score || 0)) {
                                topP[dName] = { 
                                    emp_id: currentId, 
                                    score, 
                                    name: s.name || currentId,
                                    total: Number(s.total_tasks || s.total || s.tasks_count || 0),
                                    completed: Number(s.approved_tasks || s.completed || s.tasks_completed || 0),
                                    pending: Number(s.pending_tasks || s.pending || 0),
                                    overdue_tasks: Number(s.overdue_tasks || s.overdue || 0),
                                    rework_tasks: Number(s.rework_tasks || s.rework || 0)
                                };
                            }
                        }
                    });
                    if (Object.keys(topP).length > 0) setDeptTopPerformers(topP);
                }

                if (!isCFO && !isManager) {
                    setLoading(false);
                    return;
                }
                // For CFO/Manager, we continue to fallback/enrichment to get the detailed status distribution
            }

        } catch (err) {
            console.error("Primary report fetch failed/empty, trying fallback:", err);
        }

        // Fallback: derive report rows from real DB tasks when report endpoint is empty.
        try {
            const role = (user?.role || '').toUpperCase();
            const isCFO = role === 'CFO' || role === 'ADMIN';
            const rawTasks = await fetchTasksForReports(isCFO);

            if (!rawTasks || rawTasks.length === 0) {
                setReportData([]);
                return;
            }

            // Pass 1: Build map
            const taskMap = {};
            rawTasks.forEach(t => {
                const id = t.task_id || t.id;
                const title = t.task_title || t.subtask_title || t.title || t.task_name || t.name || t.directive_title || t.directive_name;
                if (id && title) taskMap[id] = title;
            });

            // Pass 1.5: Identify missing Parent Task titles and fetch them
            const missingParentIds = new Set();
            rawTasks.forEach(t => {
                const pid = t.parent_task_id || t.parent_id || (t.parent_task ? (t.parent_task.task_id || t.parent_task.id) : null);
                const ptitle = t.parent_task_title || t.parentTaskTitle || t.parent_task_name || t.parent_title || t.parent_name || t.parent_directive_title || t.parent_directive_name || 
                              (t.parent_task ? (t.parent_task.task_title || t.parent_task.title || t.parent_task.task_name || t.parent_task.name || t.parent_task.directive_title) : '');
                
                if (pid && !ptitle && !taskMap[pid]) {
                    missingParentIds.add(pid);
                }
            });

            if (missingParentIds.size > 0) {
                console.log(`ReportsPage - Fetching details for ${missingParentIds.size} missing parents...`);
                await Promise.allSettled(
                    Array.from(missingParentIds).map(async (pid) => {
                        try {
                            const res = await api.get(`/tasks/${pid}`);
                            const pt = res.data?.data || res.data;
                            if (pt) {
                                const title = pt.task_title || pt.title || pt.task_name || pt.name || pt.directive_title || pt.directive_name;
                                if (title) taskMap[pid] = title;
                            }
                        } catch (err) {
                            console.warn(`Failed to fetch parent task ${pid}:`, err);
                        }
                    })
                );
            }

            const normalizedTasks = rawTasks.map((t) => {
                const pid = t.parent_task_id || t.parent_id || (t.parent_task ? (t.parent_task.task_id || t.parent_task.id) : null);
                const ptitle = t.parent_task_title || t.parentTaskTitle || t.parent_task_name || t.parent_title || t.parent_name || t.parent_directive_title || t.parent_directive_name || 
                              (t.parent_task ? (t.parent_task.task_title || t.parent_task.title || t.parent_task.task_name || t.parent_task.name || t.parent_task.directive_title) : '') ||
                              taskMap[pid] || '';
                
                return {
                    id: t.task_id || t.id,
                    employeeId: String(t.assigned_to_emp_id || t.employee_id || ''),
                    employeeName: t.assigned_to_name || t.assignee_name || t.employee_name || 'Unassigned',
                    departmentId: String(t.department_id || ''),
                    departmentName: t.department_name || t.department || 'N/A',
                    status: String(t.status || '').toUpperCase(),
                    dateKey: toDateKey(t.assigned_date || t.assigned_at || t.created_at || t.due_date),
                    parent_task_id: pid,
                    parent_task_title: ptitle,
                };
            });

            const filtered = normalizedTasks.filter((t) => {
                const empOk = !filters.employeeId || t.employeeId === String(filters.employeeId);
                const deptOk = !filters.departmentId
                    || t.departmentId === String(filters.departmentId)
                    || t.departmentName.toLowerCase() === String(filters.departmentId).toLowerCase();
                
                const isTerminal = TERMINAL_STATUSES.has(t.status);
                // For Active tasks, we include them in the visibility if they were created/assigned within range, OR if they are currently active.
                // For Terminal tasks (Approved), we only include them if they were finished within the range.
                const dateOk = isTerminal 
                    ? inRange(t.dateKey, filters.fromDate, filters.toDate)
                    : true; // Always include active work in the distribution/workload analysis

                return empOk && deptOk && dateOk;
            });

            if (isCFO) {
                const byDept = new Map();
                const globalByDept = new Map();

                // Seed with official manifest
                const allKnownDepts = new Set([
                    'Fixed Assets', 'Accounts Payables', 'Accounts Receivables', 'Treasury', 'MIS Report',
                    ...availableDepartments.map(d => typeof d === 'string' ? d : (d.name || d.department_id))
                ]);

                allKnownDepts.forEach(name => {
                    const entry = { 
                        department_id: name, 
                        total_tasks: 0, 
                        approved_tasks: 0, 
                        pending_tasks: 0, 
                        avg_reworks: 0, 
                        _reworks: 0,
                        new_tasks: 0,
                        in_progress_tasks: 0,
                        submitted_tasks: 0,
                        rework_tasks: 0,
                        overdue_tasks: 0
                    };
                    byDept.set(name, { ...entry });
                    globalByDept.set(name, { ...entry });
                });

                const today = new Date().toISOString().slice(0, 10);
                normalizedTasks.filter(t => {
                    const isTerminal = TERMINAL_STATUSES.has(t.status);
                    return isTerminal ? inRange(t.dateKey, filters.fromDate, filters.toDate) : true;
                }).forEach(t => {
                    const key = t.departmentName || 'N/A';
                    const existing = globalByDept.get(key) || { 
                        department_id: key, total_tasks: 0, approved_tasks: 0, pending_tasks: 0, avg_reworks: 0, _reworks: 0,
                        new_tasks: 0, in_progress_tasks: 0, submitted_tasks: 0, rework_tasks: 0, overdue_tasks: 0
                    };
                    existing.total_tasks += 1;
                    if (t.status === 'APPROVED') existing.approved_tasks += 1;
                    if (!TERMINAL_STATUSES.has(t.status)) {
                        existing.pending_tasks += 1;
                        if (t.dateKey && t.dateKey < today) existing.overdue_tasks += 1;
                    }
                    if (t.status === 'REWORK' || t.status === 'CHANGES_REQUESTED') existing.rework_tasks += 1;
                    if (t.status === 'NEW' || t.status === 'CREATED') existing.new_tasks += 1;
                    if (['IN_PROGRESS', 'STARTED', 'PENDING', 'IN-PROGRESS'].includes(t.status)) existing.in_progress_tasks += 1;
                    if (t.status === 'SUBMITTED') existing.submitted_tasks += 1;
                    
                    globalByDept.set(key, existing);
                });

                // Filtered Stats (Dept/Emp/Date filters)
                filtered.forEach((t) => {
                    const key = t.departmentName || 'N/A';
                    const existing = byDept.get(key) || { 
                        department_id: key, total_tasks: 0, approved_tasks: 0, pending_tasks: 0, avg_reworks: 0, _reworks: 0,
                        new_tasks: 0, in_progress_tasks: 0, submitted_tasks: 0, rework_tasks: 0, overdue_tasks: 0
                    };
                    existing.total_tasks += 1;
                    if (t.status === 'APPROVED') existing.approved_tasks += 1;
                    if (!TERMINAL_STATUSES.has(t.status)) {
                        existing.pending_tasks += 1;
                        if (t.dateKey && t.dateKey < today) existing.overdue_tasks += 1;
                    }
                    if (t.status === 'REWORK' || t.status === 'CHANGES_REQUESTED') existing.rework_tasks += 1;
                    if (t.status === 'NEW' || t.status === 'CREATED') existing.new_tasks += 1;
                    if (['IN_PROGRESS', 'STARTED', 'PENDING', 'IN-PROGRESS'].includes(t.status)) existing.in_progress_tasks += 1;
                    if (t.status === 'SUBMITTED') existing.submitted_tasks += 1;
                    byDept.set(key, existing);
                });

                setReportData(Array.from(byDept.values()).filter(d => d.total_tasks > 0 || !filters.departmentId));
                setGlobalReportData(Array.from(globalByDept.values()));

                // Calculate Top Performer per Department for CFO view
                const empMap = new Map();
                normalizedTasks.forEach(t => {
                    const key = t.employeeId;
                    if (!empMap.has(key)) empMap.set(key, { id: key, name: t.employeeName, dept: t.departmentName, total: 0, approved: 0 });
                    const s = empMap.get(key);
                    s.total++;
                    if (t.status === 'APPROVED') s.approved++;
                });
                const topP = {};
                const todayForRaw = new Date().toISOString().slice(0, 10);
                empMap.forEach(s => {
                    const score = s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0;
                    if (!topP[s.dept] || score > (topP[s.dept].score || 0)) {
                        // Correctly calculate overdue and rework counts from raw tasks for this individual
                        const empTasks = normalizedTasks.filter(t => t.employeeId === s.id);
                        const overdues = empTasks.filter(t => !TERMINAL_STATUSES.has(t.status) && t.dateKey && t.dateKey < todayForRaw).length;
                        const reworks = empTasks.filter(t => t.status === 'REWORK' || t.status === 'CHANGES_REQUESTED').length;
                        
                        topP[s.dept] = { 
                            emp_id: s.id, 
                            score, 
                            name: s.name,
                            total: s.total,
                            completed: s.approved,
                            pending: Math.max(0, s.total - s.approved),
                            overdue_tasks: overdues,
                            rework_tasks: reworks
                        };
                    }
                });
                setDeptTopPerformers(topP);
            } else {
                const today = new Date().toISOString().slice(0, 10);
                const byEmp = new Map();
                filtered.forEach((t) => {
                    const key = t.employeeId || t.employeeName;
                    const existing = byEmp.get(key) || {
                        emp_id: t.employeeId || key,
                        name: t.employeeName,
                        department: t.departmentName,
                        role: 'Employee',
                        total_tasks: 0,
                        approved_tasks: 0,
                        pending_tasks: 0,
                        _reworks: 0,
                        new_tasks: 0,
                        in_progress_tasks: 0,
                        submitted_tasks: 0,
                        rework_tasks: 0,
                        overdue_tasks: 0
                    };
                    existing.total_tasks += 1;
                    if (t.status === 'APPROVED') existing.approved_tasks += 1;
                    if (!TERMINAL_STATUSES.has(t.status)) {
                        existing.pending_tasks += 1;
                        if (t.dateKey && t.dateKey < today) existing.overdue_tasks += 1;
                    }
                    if (t.status === 'REWORK' || t.status === 'CHANGES_REQUESTED') existing.rework_tasks += 1;
                    if (t.status === 'NEW' || t.status === 'CREATED') existing.new_tasks += 1;
                    if (t.status === 'IN_PROGRESS' || t.status === 'STARTED') existing.in_progress_tasks += 1;
                    if (t.status === 'SUBMITTED') existing.submitted_tasks += 1;
                    byEmp.set(key, existing);
                });

                const empRows = Array.from(byEmp.values());
                setReportData(empRows);
                setGlobalReportData(empRows);
            }
        } catch (err) {
            console.error("Failed to fetch reports", err);
            setReportData([]);
            setGlobalReportData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleFilterChange = () => {
            setFilters(prev => ({
                ...prev,
                fromDate: localStorage.getItem('dashboard_from_date') || getFirstDayOfMonth(),
                toDate: localStorage.getItem('dashboard_to_date') || getToday()
            }));
        };
        window.addEventListener('dashboard-filter-change', handleFilterChange);
        return () => window.removeEventListener('dashboard-filter-change', handleFilterChange);
    }, []);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [dRes, eRes] = await Promise.all([
                    api.get('/departments'),
                    api.get('/employees')
                ]);
                setAvailableDepartments(Array.isArray(dRes.data) ? dRes.data : []);
                setAvailableEmployees(Array.isArray(eRes.data) ? eRes.data : []);
            } catch (err) {
                console.error("Failed to fetch report metadata", err);
            }
        };
        fetchMeta();
    }, []);

    useEffect(() => {
        fetchReportData();
    }, [filters]);

    const { topList, performanceData, topPerformer: bestPerformer, deptScores, topDept, underperformingDept, workloadData, empWorkloadData, empPerformanceData, aggregateDistribution, deptQuickStats } = useMemo(() => {
        const empty = {
            topList: [], performanceData: [], topPerformer: null, deptScores: [],
            topDept: null, underperformingDept: null,
            workloadData: [], empWorkloadData: [], empPerformanceData: [],
            aggregateDistribution: { new_tasks: 0, in_progress_tasks: 0, submitted_tasks: 0, approved_tasks: 0, rework_tasks: 0, overdue_tasks: 0 },
            deptQuickStats: { 
                FA: {total:0, pending:0, topEmpId: 'N/A', score: 0}, 
                AP: {total:0, pending:0, topEmpId: 'N/A', score: 0}, 
                AR: {total:0, pending:0, topEmpId: 'N/A', score: 0} 
            }
        };

        const role = (user?.role || '').toUpperCase();
        const isCFO = (role === 'CFO' || role === 'ADMIN');
        const hasData = Array.isArray(reportData) && reportData.length > 0;
        const arr = hasData ? reportData : [];

        if (!hasData) return empty;

        const isDeptShape = isCFO && !filters.employeeId;

        const CORE_DEPTS = ['FA', 'AP', 'AR', 'Treasury', 'MIS'];
        const deptLabelShort = (name = '') => {
            const n = String(name || '');
            if (n.toLowerCase().includes('accounts receivables') || n.toLowerCase() === 'ar') return 'AR';
            if (n.toLowerCase().includes('accounts payables') || n.toLowerCase() === 'ap') return 'AP';
            if (n.toLowerCase().includes('executive office')) return 'Exec';
            if (n.toLowerCase().includes('fixed assets') || n.toLowerCase() === 'fa') return 'FA';
            if (n.toLowerCase().includes('treasury')) return 'Treasury';
            if (n.toLowerCase().includes('mis report') || n.toLowerCase().includes('mis')) return 'MIS';
            return n.length > 20 ? n.slice(0, 17) + '…' : n;
        };

        // Aggregated map to prevent duplicates AND ensure core depts exist
        const aggregatedDepts = new Map();
        
        // 1. Pre-fill with core depts (0 scores)
        CORE_DEPTS.forEach(code => {
            aggregatedDepts.set(code, { name: code, total: 0, completed: 0, pending: 0, onTimePct: 0 });
        });

        // 2. Populate with real global data
        (Array.isArray(globalReportData) && globalReportData.length > 0 ? globalReportData : []).forEach(item => {
            const shortName = deptLabelShort(item.name || item.employee_name || item.department_name || item.department_id || 'Unit');
            const total = Number(item.total_tasks || item.total || item.tasks_assigned || item.tasks_count || 0);
            const completed = Number(item.approved_tasks || item.approved || item.tasks_completed || item.tasks_done || item.completed || 0);
            const pending = Number(item.pending_tasks || item.pending || (total - completed) || 0);
            let onTimePct = Number(item.on_time_pct || item.performance || item.performance_index || item.completion_rate || 0);
            if (onTimePct === 0 && total > 0) onTimePct = Math.round((completed / total) * 100);

            const existing = aggregatedDepts.get(shortName) || { name: shortName, total: 0, completed: 0, pending: 0, onTimePct: 0 };
            
            // For dept visualization, we take the one with the highest total tasks or highest performance if mapping multiple
            if (total >= existing.total) {
                aggregatedDepts.set(shortName, {
                    name: shortName,
                    total,
                    completed,
                    pending: Math.max(0, pending),
                    onTimePct
                });
            }
        });

        const globalMapped = Array.from(aggregatedDepts.values());

        const getDeptQuickStat = (id) => {
            const shortId = deptLabelShort(id);
            const d = globalMapped.find(item => 
                item.name === id || item.name === shortId || deptLabelShort(item.name) === shortId
            );
            const deptName = availableDepartments.find(ad => 
                (ad.department_id || ad.id) === id || ad.name === id || (ad.department_id || ad.id) === shortId
            )?.name || id;
            
            let top = deptTopPerformers[deptName] || deptTopPerformers[id] || deptTopPerformers[shortId];
            if (!top) {
                top = cfoTopEmployees.find(e => {
                    const empIdVal = String(e.emp_id || e.id || '').toUpperCase();
                    return empIdVal.includes(shortId.toUpperCase()) || empIdVal.includes(id.toUpperCase());
                });
            }
            if (!top) {
                const fuzzyKey = Object.keys(deptTopPerformers).find(k => 
                    String(k || '').toLowerCase().includes(String(id || '').toLowerCase()) || 
                    String(k || '').toLowerCase().includes(shortId.toLowerCase())
                );
                if (fuzzyKey) top = deptTopPerformers[fuzzyKey];
            }
            if (!top && cfoTopEmployees.length > 0) {
                top = cfoTopEmployees.find(e => String(e.emp_id || '').toUpperCase().startsWith(`EMP_${shortId.toUpperCase()}`));
            }
            
            // Last resort: find any employee in availableEmployees who belongs to this dept
            if (!top && availableEmployees.length > 0) {
                const empInDept = availableEmployees.find(e => {
                    const eDept = String(e.department || '').toLowerCase();
                    return eDept.includes(id.toLowerCase()) || eDept.includes(deptName.toLowerCase()) || 
                           (id.length > 2 && eDept.includes(shortId.toLowerCase()));
                });
                if (empInDept) {
                    top = { emp_id: empInDept.emp_id || empInDept.id, name: empInDept.name };
                }
            }
            
            // If still nothing, try matching by ID prefix (e.g. EMP_AR)
            if (!top && availableEmployees.length > 0) {
                const empWithPattern = availableEmployees.find(e => {
                    const eid = String(e.emp_id || e.id || '').toUpperCase();
                    return eid.startsWith(`EMP_${shortId.toUpperCase()}`);
                });
                if (empWithPattern) {
                    top = { emp_id: empWithPattern.emp_id || empWithPattern.id, name: empWithPattern.name };
                }
            }

            if (!d && !top) return { total: 0, pending: 0, topEmpId: 'N/A', score: 0 };
            return { 
                total: d?.total || 0, 
                pending: d?.pending || 0,
                topEmpId: top?.emp_id || top?.id || 'N/A',
                score: Math.round(top?.score || top?.onTimePct || d?.onTimePct || 0)
            };
        };

        const mapped = arr.map(item => {
            const total = Number(item.total_tasks || item.total || item.tasks_count || 0);
            const completed = Number(item.approved_tasks || item.completed || item.completed_tasks || item.approved || 0);
            const pending = Number(item.pending_tasks || item.pending || (total - completed) || 0);
            
            let onTimePct = Number(item.on_time_pct || item.performance || item.performance_index || item.score || 0);
            if (onTimePct === 0 && total > 0) onTimePct = Math.round((completed / total) * 100);
            
            const name = item.name || item.employee_name || item.department_name || item.department_id || 'Unit';
            
            let topEmpId = 'N/A';
            let displayDept = item.department || item.department_name || 'N/A';
            if (isDeptShape) {
                const s = getDeptQuickStat(name);
                topEmpId = s.topEmpId;
                if (topEmpId !== 'N/A') displayDept = topEmpId;
            } else {
                topEmpId = item.emp_id || item.id || 'N/A';
            }

            return {
                id: item.emp_id || item.id || item.department_id || Math.random(),
                name,
                role: item.role || item.designation || (isDeptShape ? 'Department' : 'Employee'),
                department: displayDept,
                topEmpId,
                total, completed, pending: Math.max(0, pending), onTimePct,
                score: onTimePct,
                new_tasks: Number(item.new_tasks || item.new || item.new_tasks_count || 0),
                in_progress_tasks: Number(item.in_progress_tasks || item.in_progress || item.started_tasks || 0),
                submitted_tasks: Number(item.submitted_tasks || item.submitted || 0),
                approved_tasks: completed,
                rework_tasks: Number(item.rework_tasks || item.rework || item.rework_count || item.rework_tasks_count || 0),
                overdue_tasks: Number(item.overdue_tasks || item.overdue || item.overdue_count || 0)
            };
        });

        const aggregateDistribution = mapped.reduce((acc, curr) => ({
            new_tasks: acc.new_tasks + (curr.new_tasks || 0),
            in_progress_tasks: acc.in_progress_tasks + (curr.in_progress_tasks || 0),
            submitted_tasks: acc.submitted_tasks + (curr.submitted_tasks || 0),
            approved_tasks: acc.approved_tasks + (curr.approved_tasks || 0),
            rework_tasks: acc.rework_tasks + (curr.rework_tasks || 0),
            overdue_tasks: acc.overdue_tasks + (curr.overdue_tasks || 0),
        }), { new_tasks: 0, in_progress_tasks: 0, submitted_tasks: 0, approved_tasks: 0, rework_tasks: 0, overdue_tasks: 0 });

        const sorted = [...mapped].sort((a, b) => b.onTimePct - a.onTimePct);

        let topList = [];
        if (!isDeptShape && isCFO) {
            const bestByDept = {};
            sorted.forEach(u => {
                const d = u.department || 'N/A';
                if (!bestByDept[d] || u.onTimePct > bestByDept[d].onTimePct) bestByDept[d] = u;
            });
            topList = Object.values(bestByDept).sort((a, b) => b.onTimePct - a.onTimePct);
        } else {
            topList = sorted.slice(0, 5);
        }

        let rawTop = topPerformer?.name ? topPerformer : null;
        if (!rawTop) {
            if (isCFO && cfoTopEmployees.length > 0) {
                const b = cfoTopEmployees[0];
                rawTop = { 
                    ...b,
                    id: b.emp_id || b.id, 
                    emp_id: b.emp_id || b.id, 
                    name: b.name || b.emp_id || 'Top Strategic Asset',
                    onTimePct: b.on_time_pct || b.score || b.performance || 0,
                    score: b.on_time_pct || b.score || b.performance || 0,
                    department: b.department || 'Office'
                };
            } else if (topList.length > 0) {
                rawTop = topList[0];
            }
        }

        // Deep lookup to match metrics (total, completed, etc) from available records
        let finalTop = rawTop;
        if (finalTop) {
            const empId = finalTop.emp_id || finalTop.id;

            // Attempt an early lookup in `deptTopPerformers` derived from raw tasks
            const deptTopMatch = Object.values(deptTopPerformers).find(u => String(u.emp_id || u.id) === String(empId) || String(u.name) === String(finalTop.name));
            if (deptTopMatch && deptTopMatch.total > 0 && (!finalTop.total || finalTop.total === 0 || !finalTop.total_tasks || finalTop.total_tasks === 0)) {
                finalTop = {
                    ...finalTop,
                    total: deptTopMatch.total,
                    total_tasks: deptTopMatch.total,
                    completed: deptTopMatch.completed,
                    approved_tasks: deptTopMatch.completed,
                    pending: deptTopMatch.pending,
                    overdue_tasks: deptTopMatch.overdue_tasks,
                    rework_tasks: deptTopMatch.rework_tasks,
                    onTimePct: deptTopMatch.score || finalTop.onTimePct,
                    score: deptTopMatch.score || finalTop.score
                };
            }
            
            // Normalize rawTop fields first in case it's a direct API response without normalization
            finalTop = {
                ...finalTop,
                total: finalTop.total || Number(finalTop.total_tasks || finalTop.tasks_count || finalTop.tasks_assigned || 0),
                completed: finalTop.completed || Number(finalTop.approved_tasks || finalTop.completed_tasks || finalTop.tasks_completed || finalTop.tasks_done || 0),
                overdue_tasks: finalTop.overdue_tasks || Number(finalTop.overdue || 0),
                rework_tasks: finalTop.rework_tasks || Number(finalTop.rework || 0)
            };
            if (!finalTop.pending) finalTop.pending = Math.max(0, finalTop.total - finalTop.completed);

            // First check if this employee exists in our current mapped list with full stats
            const matchedStats = mapped.find(u => String(u.emp_id || u.id) === String(empId));
            if (matchedStats) {
                finalTop = { ...finalTop, ...matchedStats };
            } else {
                // Check in globalReportData if mapped was department-level
                const globalMatch = (Array.isArray(globalReportData) ? globalReportData : []).find(u => 
                    String(u.emp_id || u.id) === String(empId) || 
                    String(u.name) === String(finalTop.name)
                );
                
                if (globalMatch) {
                    const total = Number(globalMatch.total_tasks || globalMatch.total || globalMatch.tasks_count || 0);
                    const completed = Number(globalMatch.approved_tasks || globalMatch.completed || globalMatch.completed_tasks || 0);
                    finalTop = { 
                        ...finalTop, 
                        total: total || finalTop.total, 
                        completed: completed || finalTop.completed, 
                        pending: Math.max(0, (total || finalTop.total || 0) - (completed || finalTop.completed || 0)),
                        overdue_tasks: Number(globalMatch.overdue_tasks || globalMatch.overdue || finalTop.overdue_tasks || 0),
                        rework_tasks: Number(globalMatch.rework_tasks || globalMatch.rework || globalMatch.avg_reworks || finalTop.rework_tasks || 0),
                        onTimePct: globalMatch.on_time_pct || globalMatch.performance_index || globalMatch.score || finalTop.onTimePct || 0
                    };
                }
            }

            // Sync with employeeSummary if IDs match (this is the most detailed data source)
            if (employeeSummary) {
                const sId = String(employeeSummary.emp_id || employeeSummary.id || '');
                const summaryIdFromFilter = String(filters.employeeId || '');
                
                if ((sId && String(empId) === sId) || (summaryIdFromFilter && String(empId) === summaryIdFromFilter)) {
                    finalTop = {
                        ...finalTop,
                        total_tasks: employeeSummary.total_tasks || finalTop.total_tasks,
                        completed_tasks: employeeSummary.completed_tasks || finalTop.completed_tasks,
                        approved_tasks: employeeSummary.completed_tasks || finalTop.approved_tasks,
                        overdue_tasks: employeeSummary.overdue_tasks || finalTop.overdue_tasks,
                        rework_tasks: employeeSummary.rework_count || employeeSummary.rework_tasks || finalTop.rework_tasks,
                        score: employeeSummary.score || finalTop.score,
                        performance: employeeSummary.score || finalTop.performance
                    };
                }
            }

            // Final sanity check for UI fields to ensure we don't display 0 if data is actually there
            finalTop = {
                ...finalTop,
                total: finalTop.total || finalTop.total_tasks || finalTop.tasks_count || finalTop.tasks_assigned || 0,
                completed: finalTop.completed || finalTop.approved_tasks || finalTop.completed_tasks || finalTop.tasks_completed || 0,
                overdue: finalTop.overdue || finalTop.overdue_tasks || finalTop.overdue_count || 0,
                reworks: finalTop.reworks || finalTop.rework_tasks || finalTop.rework_count || finalTop.avg_reworks || 0
            };
            
            // Recalculate pending and efficiency if needed
            finalTop.pending = Math.max(0, Number(finalTop.total) - Number(finalTop.completed));
            if (!finalTop.onTimePct && finalTop.total > 0) {
                finalTop.onTimePct = (finalTop.completed / finalTop.total) * 100;
            } else if (!finalTop.onTimePct && (finalTop.score || finalTop.performance)) {
                finalTop.onTimePct = finalTop.score || finalTop.performance;
            }
            
            // Refine name from metadata if possible
            if (availableEmployees.length > 0) {
                const meta = availableEmployees.find(e => String(e.emp_id || e.id) === String(empId));
                if (meta?.name) finalTop.name = meta.name;
            }
        }

        return {
            performanceData: mapped,
            topList,
            topPerformer: finalTop,
            deptScores: isDeptShape ? globalMapped.map(d => ({ name: d.name, Performance: d.onTimePct })) : [],
            topDept: sorted[0] ? { name: sorted[0].name, Performance: sorted[0].onTimePct, Tasks: sorted[0].total } : null,
            underperformingDept: sorted.length > 1 ? { name: sorted[sorted.length - 1].name, Performance: sorted[sorted.length - 1].onTimePct, Tasks: sorted[sorted.length - 1].total } : null,
            workloadData: isDeptShape ? globalMapped.map(d => ({ name: d.name, Total: d.total, Completed: d.completed, Pending: d.pending })) : mapped.map(d => ({ name: d.name, Total: d.total, Completed: d.completed, Pending: d.pending })),
            empWorkloadData: !isDeptShape ? mapped.map(u => ({ name: u.name, Completed: u.completed, Pending: u.pending })) : [],
            empPerformanceData: !isDeptShape ? mapped.map(u => ({ name: u.name, Performance: u.onTimePct })) : [],
            aggregateDistribution,
            deptQuickStats: {
                FA: getDeptQuickStat('FA'),
                AP: getDeptQuickStat('AP'),
                AR: getDeptQuickStat('AR')
            }
        };
    }, [reportData, globalReportData, user?.role, filters.employeeId, availableDepartments, topPerformer, cfoTopEmployees, deptTopPerformers, employeeSummary]);


    const downloadFile = async (format) => {
        const toastId = toast.loading(`Preparing ${format.toUpperCase()} report...`);
        try {
            const role = (user?.role || '').toUpperCase();
            const isEmployee = role === 'EMPLOYEE';
            
            let endpoint = `/reports/performance.${format}`;
            const params = {
                from_date: filters.fromDate || undefined,
                to_date: filters.toDate || undefined,
                start_date: filters.fromDate || undefined,
                end_date: filters.toDate || undefined
            };

            if (isEmployee) {
                // Using the generic endpoint as it's more reliable
                endpoint = `/reports/performance.${format}`;
            } else {
                endpoint = format === 'pdf' ? '/reports/cfo/export-pdf' : '/reports/cfo/export-excel';
                if (filters.departmentId) params.department_id = filters.departmentId;
                if (filters.employeeId) params.employee_id = filters.employeeId;
            }

            const response = await api.get(endpoint, {
                params,
                responseType: 'blob'
            });

            // Handle potential JSON error wrapped in blob
            if (response.data.size < 250) {
                const text = await response.data.text();
                try {
                    const errorJson = JSON.parse(text);
                    throw new Error(errorJson.detail || errorJson.message || 'Export failed');
                } catch (e) { /* Proceed if not JSON */ }
            }

            const contentType = response.headers['content-type'] || (format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            const blob = new Blob([response.data], { type: contentType });
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `performance_report_${filters.fromDate || 'all'}_to_${filters.toDate || 'now'}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);

            toast.success(`${format.toUpperCase()} downloaded successfully`, { id: toastId });
        } catch (err) {
            console.error(`Failed to download ${format}`, err);
            const errorMsg = err.response?.data?.message || err.message || `Failed to download ${format} report`;
            toast.error(errorMsg, { id: toastId });
        }
    };

    const handleDownloadExcel = () => {
        downloadFile('excel');
    };

    const handleDownloadPDF = () => {
        downloadFile('pdf');
    };

    const trendData = [
        { name: 'Jan', Sales: 65, Engineering: 70, HR: 80 },
        { name: 'Feb', Sales: 68, Engineering: 75, HR: 78 },
        { name: 'Mar', Sales: 75, Engineering: 72, HR: 82 },
        { name: 'Apr', Sales: 80, Engineering: 85, HR: 85 },
        { name: 'May', Sales: 85, Engineering: 82, HR: 88 },
        { name: 'Jun', Sales: 90, Engineering: 88, HR: 90 },
    ];

    if (loading && !reportData) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500 mr-3" />
                Loading reports...
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* ══ ANALYTICS EXECUTIVE LIGHT HERO ══ */}
            <div className="rounded-[1.5rem] bg-white shadow-md relative border border-slate-100 px-6 py-4 overflow-hidden mb-6 group transition-all">
                {/* Clean Accents */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-40 group-hover:opacity-70 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-40 group-hover:opacity-70 transition-opacity" />

                <div className="relative z-10 flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-2.5 rounded-[0.8rem] shadow-md hover:scale-110 transition-transform">
                            <TrendingUp size={20} className="text-emerald-400" />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-1.5 rounded-[1rem] border border-slate-100 shadow-sm transition-all w-full sm:max-w-7xl justify-end">
                        <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">From</span>
                                <input
                                    type="date"
                                    className="bg-transparent text-[13px] font-semibold outline-none cursor-pointer text-slate-900 border-none p-0 focus:ring-0"
                                    value={filters.fromDate}
                                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                />
                            </div>
                            <div className="w-px h-8 bg-slate-100" />
                            <div className="flex items-center gap-2.5">
                                <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">To</span>
                                <input
                                    type="date"
                                    className="bg-transparent text-[13px] font-semibold outline-none cursor-pointer text-slate-900 border-none p-0 focus:ring-0"
                                    value={filters.toDate}
                                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDownloadPDF}
                                className="bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-md transition-all px-5 py-3 rounded-xl font-semibold text-[11px] capitalize tracking-widest flex items-center gap-2 active:scale-95 whitespace-nowrap"
                            >
                                <Download size={14} className="text-indigo-400" /> Pdf
                            </button>
                            <button
                                onClick={handleDownloadExcel}
                                className="bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-md transition-all px-5 py-3 rounded-xl font-semibold text-[11px] capitalize tracking-widest flex items-center gap-2 active:scale-95 whitespace-nowrap"
                            >
                                <FileSpreadsheet size={14} className="text-emerald-500" /> Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── HERO HIGHLIGHT: Department Top Performer (Primary Anchor) ── */}
            <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-md p-10 hover:shadow-xl transition-all group overflow-hidden relative">
                    <h3 className="text-[22px] font-semibold text-slate-800 mb-8 tracking-tight">
                        Department Top Performer
                    </h3>
                    <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
                        {/* Left: Profile Section */}
                        <div className="flex items-center gap-10 min-w-fit">
                            <div className="relative w-36 h-36 shrink-0">
                                <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-100 via-white to-indigo-50 border-[6px] border-white flex items-center justify-center text-5xl font-semibold text-slate-800 shadow-[0_15px_40px_rgba(79,70,229,0.15)] overflow-hidden ring-[12px] ring-indigo-50/20 group-hover:scale-105 transition-transform duration-500">
                                    {(bestPerformer?.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="absolute bottom-1 right-1 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-[4px] border-white flex items-center justify-center text-white shadow-lg animate-bounce-subtle z-20">
                                    <TrendingUp size={22} strokeWidth={3} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[32px] font-medium text-slate-800 leading-tight tracking-tight">
                                    {bestPerformer?.name || 'Unit Alpha'}
                                </h4>
                                <div className="flex items-center gap-4">
                                    <div className="px-5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold capitalize tracking-widest rounded-xl shadow-lg flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        {bestPerformer?.emp_id || bestPerformer?.id || 'Global'}
                                    </div>
                                    <p className="text-[16px] font-medium text-slate-400 capitalize tracking-tight">
                                        {bestPerformer?.department && bestPerformer.department !== 'N/A' ? bestPerformer.department : 'Executive Strategic Asset'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Right: Metrics Grid */}
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 sm:gap-x-12 gap-y-6 max-w-3xl ml-auto py-6 sm:py-8 px-6 sm:px-12 bg-slate-50/50 backdrop-blur-sm rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-[inset_0_2px_15px_rgba(0,0,0,0.02)]">
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-extrabold text-slate-400 capitalize tracking-normal">Efficiency</span>
                                <span className="text-3xl font-semibold text-indigo-600 tabular-nums">{(bestPerformer?.onTimePct || 0).toFixed(0)}%</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-extrabold text-slate-400 capitalize tracking-normal">Total Tasks</span>
                                <span className="text-3xl font-semibold text-slate-800 tabular-nums">{bestPerformer?.total || 0}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-extrabold text-emerald-600/70 capitalize tracking-normal">Completed</span>
                                <span className="text-3xl font-semibold text-emerald-600 tabular-nums">{bestPerformer?.completed || 0}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-extrabold text-amber-600/70 capitalize tracking-normal">Pending</span>
                                <span className="text-3xl font-semibold text-amber-500 tabular-nums">{bestPerformer?.pending || 0}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-extrabold text-rose-600/70 capitalize tracking-normal">Overdue</span>
                                <span className="text-3xl font-semibold text-rose-600 tabular-nums">{bestPerformer?.overdue || bestPerformer?.overdue_tasks || 0}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-extrabold text-violet-600/70 capitalize tracking-normal">Reworks</span>
                                <span className="text-3xl font-semibold text-violet-600 tabular-nums">{bestPerformer?.reworks || bestPerformer?.rework_tasks || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -z-10" />
                </div>
            </div>

            {/* ── INSIGHT CARDS (Role Specific) ── */}
            {isEmployee && employeeSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-4 duration-500 mb-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-md h-32 flex flex-col justify-between group transition-all hover:shadow-lg">
                        <div className="flex justify-between items-start">
                            <span className="text-[12px] font-black capitalize tracking-widest text-indigo-600/70">Active Tasks</span>
                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-500 group-hover:scale-110 transition-transform">
                                <ClipboardCheck size={20} />
                            </div>
                        </div>
                        <span className="text-4xl font-black text-slate-900 tabular-nums leading-none mb-1">{employeeSummary.total_tasks || 0}</span>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-md h-32 flex flex-col justify-between group transition-all hover:shadow-lg">
                        <div className="flex justify-between items-start">
                            <span className="text-[12px] font-black capitalize tracking-widest text-emerald-600/70">Completed</span>
                            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                                <CheckSquare size={20} />
                            </div>
                        </div>
                        <span className="text-4xl font-black text-emerald-600 tabular-nums leading-none mb-1">{employeeSummary.completed_tasks || 0}</span>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-md h-32 flex flex-col justify-between group transition-all hover:shadow-lg">
                        <div className="flex justify-between items-start">
                            <span className="text-[12px] font-black capitalize tracking-widest text-amber-600/70">In Progress</span>
                            <div className="p-3 bg-amber-50 rounded-xl text-amber-500 group-hover:scale-110 transition-transform">
                                <Play size={20} />
                            </div>
                        </div>
                        <span className="text-4xl font-black text-amber-600 tabular-nums leading-none mb-1">{(employeeSummary.total_tasks - employeeSummary.completed_tasks) || 0}</span>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-md h-32 flex flex-col justify-between group transition-all hover:shadow-lg">
                        <div className="flex justify-between items-start">
                            <span className="text-[12px] font-black capitalize tracking-widest text-rose-600/70">Overdue</span>
                            <div className="p-3 bg-rose-50 rounded-xl text-rose-500 group-hover:scale-110 transition-transform">
                                <AlertTriangle size={20} />
                            </div>
                        </div>
                        <span className="text-4xl font-black text-rose-600 tabular-nums leading-none mb-1">{employeeSummary.overdue_tasks || 0}</span>
                    </div>
                    <div className="bg-violet-600 rounded-2xl p-5 border border-violet-500 shadow-md h-32 flex flex-col justify-between text-white relative overflow-hidden group transition-all hover:shadow-lg hover:bg-violet-700">
                        <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform">
                            <TrendingUp size={80} />
                        </div>
                        <div className="flex justify-between items-start relative z-10">
                            <span className="text-[12px] font-black capitalize tracking-widest text-violet-100">VS Dept Avg</span>
                            <div className="p-3 bg-white/10 rounded-xl text-white">
                                <Activity size={20} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1 relative z-10">
                            <span className="text-3xl font-black">{employeeSummary.score || 0}%</span>
                            <span className="text-xs font-semibold opacity-60">/ {employeeSummary.dept_avg || 0}%</span>
                        </div>
                    </div>
                </div>
            ) : (
                isManager && (topList.length > 0 || workloadData?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-500 mb-6">
                        {topDept && (
                            <div className="mesh-gradient-emerald rounded-2xl p-4 border border-emerald-200/50 shadow-md flex flex-col justify-center relative overflow-hidden group/top card-gloss h-24">
                                <div className="absolute top-2 right-2 bg-emerald-500/10 p-1.5 rounded-lg">
                                    <TrendingUp size={18} className="text-emerald-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-semibold capitalize tracking-[0.1em] text-emerald-600/70 mb-1">Leader</span>
                                    <span className="text-lg font-bold text-emerald-900 capitalize tracking-tight leading-none mb-1">{topDept.name}</span>
                                    <span className="text-2xl font-semibold text-emerald-600 tabular-nums">{Number.isNaN(topDept.Performance) ? 0 : topDept.Performance}%</span>
                                </div>
                            </div>
                        )}
                        {underperformingDept && underperformingDept.name !== topDept?.name && (
                            <div className="mesh-gradient-rose rounded-2xl p-4 border border-rose-200/50 shadow-md flex flex-col justify-center relative overflow-hidden group/needs card-gloss h-24">
                                <div className="absolute top-2 right-2 bg-rose-500/10 p-1.5 rounded-lg">
                                    <TrendingDown size={18} className="text-rose-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-semibold capitalize tracking-[0.1em] text-rose-600/70 mb-1">Intervention</span>
                                    <span className="text-lg font-bold text-rose-900 capitalize tracking-tight leading-none mb-1">{underperformingDept.name}</span>
                                    <span className="text-2xl font-semibold text-rose-600 tabular-nums">{Number.isNaN(underperformingDept.Performance) ? 0 : underperformingDept.Performance}%</span>
                                </div>
                            </div>
                        )}
                        {workloadData?.length > 0 && (
                            <div className="md:col-span-2 bg-white rounded-2xl p-4 border border-slate-200/60 shadow-md relative overflow-hidden mesh-gradient h-24 flex items-center">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                                    {workloadData.slice(0, 4).map((d, idx) => (
                                        <div key={`${d.name}-${idx}`} className="flex flex-col">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                                <span className="text-[10px] font-semibold text-slate-800 capitalize tracking-tight leading-none whitespace-normal break-words">{d.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 pl-3">
                                                <span className="text-lg font-semibold text-slate-900">{d.Total}</span>
                                                <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1 rounded-md">
                                                    {d.Pending} P
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* ── EXECUTIVE KPI INSIGHT ROW ── */}
            {(['ADMIN', 'CFO'].includes((user?.role || '').toUpperCase())) && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                    {[
                        { 
                            label: 'Leader', 
                            value: topDept?.name || 'N/A', 
                            sub: `${topDept?.Performance || 0}% Success`,
                            icon: Trophy, 
                            color: 'text-amber-600', 
                            bg: 'bg-amber-50'
                        },
                        { 
                            label: 'Intervention', 
                            value: underperformingDept?.name || 'N/A', 
                            sub: `${underperformingDept?.Performance || 0}% Rate`,
                            icon: AlertCircle, 
                            color: 'text-rose-600', 
                            bg: 'bg-rose-50'
                        },
                        { 
                            label: 'Fixed Assets (FA)', 
                            value: deptQuickStats?.FA?.topEmpId || 'N/A', 
                            sub: `${deptQuickStats?.FA?.score || 0}% Success`,
                            icon: Building2, 
                            color: 'text-indigo-600', 
                            bg: 'bg-indigo-50'
                        },
                        { 
                            label: 'Accounts Payable (AP)', 
                            value: deptQuickStats?.AP?.topEmpId || 'N/A', 
                            sub: `${deptQuickStats?.AP?.score || 0}% Rate`,
                            icon: Landmark, 
                            color: 'text-emerald-600', 
                            bg: 'bg-emerald-50'
                        },
                        { 
                            label: 'Accounts Receivable (AR)', 
                            value: deptQuickStats?.AR?.topEmpId || 'N/A', 
                            sub: `${deptQuickStats?.AR?.score || 0}% Score`,
                            icon: HandCoins, 
                            color: 'text-blue-600', 
                            bg: 'bg-blue-50'
                        }
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-2 hover:shadow-md transition-all group min-h-[140px]">
                            <div className="flex items-center gap-3 mb-1">
                                <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color} border border-white shadow-sm shrink-0 group-hover:scale-110 transition-transform`}>
                                    <kpi.icon size={18} strokeWidth={2.5} />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 capitalize tracking-widest leading-none">
                                    {kpi.label}
                                </span>
                            </div>

                            <div className="mt-auto">
                                <h4 className="text-[20px] font-medium text-slate-800 tracking-tight leading-none whitespace-normal group-hover:text-indigo-600 transition-colors transition-all">
                                    {kpi.value}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[12px] font-semibold ${kpi.color} tabular-nums`}>
                                        {kpi.sub}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <TaskDistributionCard 
                data={filters.employeeId ? (performanceData.find(e => String(e.id) === String(filters.employeeId)) || aggregateDistribution) : aggregateDistribution}
                title={filters.employeeId ? "Task Distribution (Personal)" : "Task Distribution (Aggregate)"}
                titleClassName="text-[18px] font-semibold"
            />

                {/* ── Manager: employee-wise charts ── */}
                {(user?.role || '').toUpperCase() === 'MANAGER' && (
                    <>
                        <ChartPanel title="Employee Workload Distribution">
                            {empWorkloadData.length > 0 ? (
                                <BarChart data={empWorkloadData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 18 }} interval={0} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar dataKey="Completed" stackId="a" fill="#10b981" name="Completed" />
                                    <Bar dataKey="Pending" stackId="a" fill="#f59e0b" name="Pending" />
                                </BarChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <CheckSquare size={32} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-semibold capitalize tracking-widest">No workload data</span>
                                </div>
                            )}
                        </ChartPanel>

                        <ChartPanel title="Employee Performance Index (%)" height={280} compact={false}>
                            {empPerformanceData.length > 0 ? (
                                <BarChart data={empPerformanceData} margin={{ top: 20, right: 20, bottom: 40, left: 10 }}>
                                    <defs>
                                        <linearGradient id="empPerfGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#4f46e5" stopOpacity={1}/>
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                                        interval={0} 
                                        angle={-40} 
                                        textAnchor="end"
                                        height={60}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis 
                                        domain={[0, 100]} 
                                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                        formatter={v => [`${v}%`, 'Performance']}
                                    />
                                    {/* Background bar to show potential */}
                                    <Bar dataKey={() => 100} fill="#f1f5f9" radius={[6, 6, 0, 0]} barSize={28} isAnimationActive={false} />
                                    <Bar 
                                        dataKey="Performance" 
                                        fill="url(#empPerfGradient)" 
                                        name="Rank Score" 
                                        radius={[6, 6, 0, 0]} 
                                        barSize={28} 
                                        label={{ position: 'top', fontSize: 10, fontWeight: 800, fill: '#6366f1', formatter: (v) => `${v}%` }}
                                    />
                                </BarChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <TrendingUp size={32} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-semibold capitalize tracking-widest">No performance data</span>
                                </div>
                            )}
                        </ChartPanel>
                    </>
                )}

                {/* ── Employee: personal charts ── */}
                {(user?.role || '').toUpperCase() === 'EMPLOYEE' && (
                    <>
                        <ChartPanel title="Monthly Performance Trend">
                            {monthlyTrend.length > 0 ? (
                                <ComposedChart data={monthlyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="month" 
                                        tick={{ fontSize: 10, fill: '#64748b' }} 
                                        tickFormatter={(val) => {
                                            const [y, m] = val.split('-');
                                            return new Date(y, m - 1).toLocaleString('default', { month: 'short' });
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis yAxisId="left" tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12, fontWeight: 600, fill: '#8b5cf6' }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                        labelStyle={{ color: '#1e293b', fontWeight: 900 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 700, textTransform: 'capitalize', paddingTop: '15px' }} />
                                    <Bar yAxisId="left" dataKey="completed_tasks" fill="#10b981" name="Approved Tasks" radius={[4, 4, 0, 0]} barSize={30} />
                                    <Line yAxisId="right" type="monotone" dataKey="score" stroke="#8b5cf6" name="Performance Score %" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                                </ComposedChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <TrendingUp size={32} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-semibold capitalize tracking-widest">No trend data available</span>
                                </div>
                            )}
                        </ChartPanel>
                    </>
                )}

                {/* ── CFO / Admin: dept-wise charts ── */}
                {(['ADMIN', 'CFO'].includes((user?.role || '').toUpperCase())) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <ChartPanel title="Division Workload Distribution" titleClassName="text-[20px] mb-6 font-bold" height={350}>
                            {workloadData.length > 0 ? (
                                <BarChart data={workloadData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                                            <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                                        </linearGradient>
                                        <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                                            <stop offset="100%" stopColor="#d97706" stopOpacity={0.8}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 13, fontWeight: 700, fill: '#475569' }} 
                                        interval={0} 
                                        height={50} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px' }}
                                    />
                                    <Legend 
                                        verticalAlign="top" 
                                        align="right"
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '13px', fontBold: true, paddingBottom: '20px' }} 
                                    />
                                    <Bar dataKey="Completed" stackId="a" fill="url(#completedGrad)" name="Approved Tasks" radius={[0, 0, 0, 0]} barSize={40} label={{ position: 'center', fill: '#fff', fontSize: 11, fontWeight: 800 }} />
                                    <Bar dataKey="Pending" stackId="a" fill="url(#pendingGrad)" name="Pending Items" radius={[6, 6, 0, 0]} barSize={40} label={{ position: 'center', fill: '#fff', fontSize: 11, fontWeight: 800 }} />
                                </BarChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                       <Activity size={32} className="opacity-20 animate-pulse text-indigo-500" />
                                    </div>
                                    <span className="text-[12px] font-semibold capitalize tracking-widest text-center">Calibrating workload metrics...</span>
                                </div>
                            )}
                        </ChartPanel>

                        {/* Performance Index Chart moved into same grid row */}
                        {deptScores.length > 0 && (
                            <ChartPanel title="Department Performance Index (%)" height={350} compact={false} titleClassName="text-[20px] mb-6 font-bold">
                                <BarChart data={deptScores} margin={{ top: 30, right: 30, bottom: 20, left: 10 }}>
                                    <defs>
                                        <linearGradient id="deptPerfGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.7}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 13, fontWeight: 800, fill: '#475569' }}
                                        interval={0}
                                        textAnchor="middle"
                                        height={50}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `${v}%`}
                                        label={{ value: 'Performance Score', angle: -90, position: 'insideLeft', style: { fontSize: '10px', fill: '#94a3b8', fontWeight: 600 } }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px rgba(0,0,0,0.1)', padding: '20px' }}
                                        formatter={(val) => [`${val}%`, 'Dept Efficiency']}
                                    />
                                    <Bar dataKey={() => 100} fill="#f8fafc" radius={[12, 12, 0, 0]} barSize={40} isAnimationActive={false} />
                                    <Bar
                                        dataKey="Performance"
                                        fill="url(#deptPerfGradient)"
                                        radius={[12, 12, 0, 0]}
                                        barSize={40}
                                        label={{ 
                                            position: 'top', 
                                            fill: '#4f46e5', 
                                            fontSize: 14, 
                                            fontWeight: 900, 
                                            formatter: (val) => `${val}%`,
                                            offset: 10
                                        }}
                                    >
                                        {deptScores.map((entry, index) => (
                                            <Cell key={`cell-${index}`} cursor="pointer" fillOpacity={entry.Performance < 50 ? 0.7 : 1} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartPanel>
                        )}
                    </div>
                )}

            {/* ── BOTTOM TABLES: unified seamless card ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    {/* Performance Report */}
                    <div className="overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-[18px] font-semibold text-slate-800 capitalize tracking-tight">Performance Report</h3>
                            <button
                                onClick={() => setFilters({ employeeId: '', departmentId: '', fromDate: '', toDate: '' })}
                                className="text-[12px] font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg hover:bg-violet-100 transition-colors capitalize px-4"
                            >
                                Reset
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white text-slate-500 text-[14px] capitalize font-semibold tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-3 py-4 text-center">Total</th>
                                        <th className="px-3 py-4 text-center">Done</th>
                                        <th className="px-3 py-4 text-center">On-Time %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {performanceData.length > 0 ? (
                                        performanceData.map((row, idx) => (
                                            <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="text-[17px] font-medium text-slate-900 group-hover:text-indigo-600 transition-colors capitalize leading-tight">{row.name}</div>
                                                    <div className="text-[11px] text-slate-400 font-bold capitalize tracking-tighter mt-1">{row.department}</div>
                                                </td>
                                                <td className="px-3 py-4 text-center text-[17px] font-semibold text-slate-700 tabular-nums">{row.total}</td>
                                                <td className="px-3 py-4 text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-semibold text-[17px] tabular-nums">
                                                        {row.completed}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <span className="text-[17px] font-semibold text-indigo-600 tabular-nums">{row.onTimePct}%</span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-8 text-center text-slate-400 italic">No data found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top High Performers */}
                    <div className="overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/30">
                            <h3 className="text-[18px] font-semibold text-slate-800 capitalize tracking-tight">Top High Performers</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white text-slate-500 text-[14px] capitalize font-semibold tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Rank</th>
                                        <th className="px-6 py-4">Entity</th>
                                        <th className="px-6 py-4 text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {topList.length > 0 ? topList.map((emp, i) => (
                                        <tr key={`${emp.id}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-[17px] font-semibold text-slate-600">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[14px] ${
                                                    i === 0 ? 'bg-amber-100 text-amber-600 shadow-sm' :
                                                    i === 1 ? 'bg-slate-100 text-slate-500' :
                                                    i === 2 ? 'bg-orange-50 text-orange-600' :
                                                    'bg-slate-50 text-slate-400'
                                                }`}>
                                                    {i + 1}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[17px] font-medium text-slate-900 capitalize leading-tight">{emp.name}</div>
                                                <div className="text-[11px] text-slate-400 font-bold capitalize tracking-tighter mt-1">{emp.role}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-[17px] font-semibold text-indigo-600 tabular-nums">
                                                {emp.score}%
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-10 text-center text-slate-400 italic">
                                                No ranking data available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PieChart2 = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
);

export default ReportsPage;
