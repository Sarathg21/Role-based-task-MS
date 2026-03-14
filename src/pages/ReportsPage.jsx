import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getEmployeeRankings } from '../utils/rankingEngine';
import ChartPanel from '../components/Charts/ChartPanel';
import { Download, FileSpreadsheet, TrendingUp, TrendingDown, Calendar, ArrowRight, CheckSquare, BarChart2, Activity, Users, ClipboardCheck, Play, Upload, AlertTriangle } from 'lucide-react';
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

const inRange = (dateKey, fromDate, toDate) => {
    if (!dateKey) return !fromDate && !toDate;
    if (fromDate && dateKey < fromDate) return false;
    if (toDate && dateKey > toDate) return false;
    return true;
};


const TaskDistributionCard = ({ data, title = "Task Distribution" }) => {
    if (!data || Object.keys(data).length === 0) return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-8 text-center h-[320px] flex flex-col items-center justify-center">
            <Activity className="w-10 h-10 text-slate-200 mb-4 opacity-50" />
            <p className="text-slate-400 font-bold capitalize tracking-widest text-[10px]">Syncing Distribution...</p>
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

    const displayData = [
        { name: 'New', value: data.new_tasks || 0, color: COLORS['New'] },
        { name: 'In Progress', value: data.in_progress_tasks || 0, color: COLORS['In Progress'] },
        { name: 'Submitted', value: data.submitted_tasks || 0, color: COLORS['Submitted'] },
        { name: 'Approved', value: data.approved_tasks || data.completed_tasks || 0, color: COLORS['Approved'] },
        { name: 'Rework', value: data.rework_tasks || data.rework_count || 0, color: COLORS['Rework'] },
        { name: 'Overdue', value: data.overdue_tasks || 0, color: COLORS['Overdue'] }
    ].filter(d => d.value > 0);

    const grandTotal = displayData.reduce((acc, d) => acc + d.value, 0) || 1;

    return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 transition-all hover:shadow-md h-full flex flex-col min-h-[320px]">
            <h3 className="text-[13px] font-black text-slate-700 mb-6 flex items-center gap-2 capitalize tracking-tight">
                <BarChart2 size={14} className="text-indigo-500" />
                {title}
            </h3>
            
            <div className="flex flex-1 items-center gap-8 px-2">
                <div className="relative w-40 h-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
                        <PieChart>
                            <Pie
                                data={displayData}
                                cx="50%"
                                cy="50%"
                                innerRadius={48}
                                outerRadius={75}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                            >
                                {displayData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[9px] font-bold text-slate-400 capitalize tracking-tighter">Total</span>
                        <span className="text-2xl font-black text-slate-800 tabular-nums">{grandTotal === 1 && displayData.length === 0 ? 0 : grandTotal}</span>
                    </div>
                </div>

                <div className="flex-1 space-y-3.5">
                    {displayData.map((item, idx) => {
                        const pct = Math.round((item.value / grandTotal) * 100);
                        return (
                            <div key={idx} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-[12px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors capitalize tracking-tight">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-black text-slate-800 tabular-nums w-8 text-right">{pct}%</span>
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
        fromDate: '',
        toDate: ''
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
                setReportData(stats);
                setLoading(false);
                return;
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
                const title = t.task_title || t.title || t.task_name || t.name || t.directive_title || t.directive_name;
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
                const dateOk = inRange(t.dateKey, filters.fromDate, filters.toDate);
                return empOk && deptOk && dateOk;
            });

            if (isCFO) {
                const byDept = new Map();
                const globalByDept = new Map();

                // Seed with ALL available departments
                availableDepartments.forEach(d => {
                    const name = typeof d === 'string' ? d : (d.name || d.department_id);
                    const entry = { department_id: name, total_tasks: 0, approved_tasks: 0, pending_tasks: 0, avg_reworks: 0, _reworks: 0 };
                    byDept.set(name, { ...entry });
                    globalByDept.set(name, { ...entry });
                });

                const today = new Date().toISOString().slice(0, 10);
                normalizedTasks.filter(t => inRange(t.dateKey, filters.fromDate, filters.toDate)).forEach(t => {
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
                    if (t.status === 'IN_PROGRESS' || t.status === 'STARTED') existing.in_progress_tasks += 1;
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
                    if (t.status === 'IN_PROGRESS' || t.status === 'STARTED') existing.in_progress_tasks += 1;
                    if (t.status === 'SUBMITTED') existing.submitted_tasks += 1;
                    byDept.set(key, existing);
                });

                setReportData(Array.from(byDept.values()).filter(d => d.total_tasks > 0 || !filters.departmentId));
                setGlobalReportData(Array.from(globalByDept.values()));
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

    const { topList, performanceData, topPerformer: bestPerformer, deptScores, topDept, underperformingDept, workloadData, empWorkloadData, empPerformanceData, aggregateDistribution } = useMemo(() => {
        const empty = {
            topList: [], performanceData: [], topPerformer: null, deptScores: [],
            topDept: null, underperformingDept: null,
            workloadData: [], empWorkloadData: [], empPerformanceData: []
        };

        const role = (user?.role || '').toUpperCase();
        const isCFO = (role === 'CFO' || role === 'ADMIN');
        const isManager = role === 'MANAGER';

        const hasData = Array.isArray(reportData) && reportData.length > 0;
        const arr = hasData ? reportData : [];

        if (!hasData) return empty;

        const first = arr[0] || {};
        // If it's a Manager, it's definitely employees. 
        // If it's a CFO, we check if they have specific employee ID filters
        const isDeptShape = isCFO && !filters.employeeId && (!!first.department_id || !!first.department_stats);

        const deptLabelShort = (name = '') => {
            const n = String(name);
            if (n.toLowerCase().includes('accounts receivables')) return 'AR';
            if (n.toLowerCase().includes('accounts payables')) return 'AP';
            if (n.toLowerCase().includes('executive office')) return 'Exec';
            if (n.toLowerCase().includes('fixed assets')) return 'FA';
            if (n.toLowerCase().includes('treasury')) return 'Treasury';
            if (n.toLowerCase().includes('mis report')) return 'MIS';
            return n.length > 20 ? n.slice(0, 17) + '…' : n;
        };

        const mapped = arr.map(item => {
            const total = Number(item.total_tasks || item.total || item.tasks_assigned || item.tasks_count || 0);
            const completed = Number(item.approved_tasks || item.approved || item.tasks_completed || item.tasks_done || item.completed || 0);
            const pending = Number(item.pending_tasks || item.pending || (total - completed) || 0);

            let onTimePct = Number(item.on_time_pct || item.performance || item.performance_index || item.completion_rate || 0);
            if (onTimePct === 0 && total > 0) {
                onTimePct = Math.round((completed / total) * 100);
            }

            return {
                id: item.emp_id || item.id || item.department_id || Math.random(),
                name: item.name || item.employee_name || item.department_name || item.department_id || 'Unit',
                role: item.role || item.designation || (isDeptShape ? 'Department' : 'Employee'),
                department: item.department || item.department_name || 'N/A',
                total,
                completed,
                pending: Math.max(0, pending),
                onTimePct,
                avgReworks: Number(item.avg_reworks || (item._reworks / (total || 1)) || 0).toFixed(2),
                score: onTimePct,
                manager: item.manager_name || 'Supervisor',
                // Specialized status counts
                new_tasks: Number(item.new_tasks || 0),
                in_progress_tasks: Number(item.in_progress_tasks || 0),
                submitted_tasks: Number(item.submitted_tasks || 0),
                approved_tasks: completed,
                rework_tasks: Number(item.rework_tasks || item._reworks || 0),
                overdue_tasks: Number(item.overdue_tasks || 0)
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

        const globalMapped = (Array.isArray(globalReportData) && globalReportData.length > 0 ? globalReportData : []).map(item => {
            const total = Number(item.total_tasks || item.total || item.tasks_assigned || item.tasks_count || 0);
            const completed = Number(item.approved_tasks || item.approved || item.tasks_completed || item.tasks_done || item.completed || 0);
            const pending = Number(item.pending_tasks || item.pending || (total - completed) || 0);

            let onTimePct = Number(item.on_time_pct || item.performance || item.performance_index || item.completion_rate || 0);
            if (onTimePct === 0 && total > 0) {
                onTimePct = Math.round((completed / total) * 100);
            }

            return {
                name: deptLabelShort(item.name || item.employee_name || item.department_name || item.department_id || 'Unit'),
                total,
                completed,
                pending: Math.max(0, pending),
                onTimePct
            };
        });

        const sorted = [...mapped].sort((a, b) => b.onTimePct - a.onTimePct);

        // Top performers list:
        // - For CFO/Admin on employee data: show TOP performer of EACH department
        // - Otherwise: simple global top N
        let topList = [];
        if (!isDeptShape && isCFO) {
            const bestByDept = {};
            sorted.forEach((u) => {
                const dept = u.department || 'N/A';
                if (!bestByDept[dept] || u.onTimePct > bestByDept[dept].onTimePct) {
                    bestByDept[dept] = u;
                }
            });
            topList = Object.values(bestByDept).sort((a, b) => b.onTimePct - a.onTimePct);
        } else {
            topList = sorted.slice(0, 5);
        }

        const safeTop = (topPerformer?.name && !topPerformer.name.toLowerCase().includes('employee')) ? topPerformer : null;
        const fallbackTop = (topList[0]?.name && !topList[0].name.toLowerCase().includes('employee')) ? topList[0] : null;

        return {
            performanceData: mapped,
            topList,
            topPerformer: safeTop || fallbackTop,
            deptScores: isDeptShape ? globalMapped.map(d => ({ name: d.name, Performance: d.onTimePct })) : [],
            topDept: sorted[0] ? { name: sorted[0].name, Performance: sorted[0].onTimePct, Tasks: sorted[0].total } : null,
            underperformingDept: sorted.length > 1 ? { name: sorted[sorted.length - 1].name, Performance: sorted[sorted.length - 1].onTimePct, Tasks: sorted[sorted.length - 1].total } : null,
            workloadData: isDeptShape ? globalMapped.map(d => ({ name: d.name, Total: d.total, Completed: d.completed, Pending: d.pending })) : mapped.map(d => ({ name: d.name, Total: d.total, Completed: d.completed, Pending: d.pending })),
            empWorkloadData: !isDeptShape ? mapped.map(u => ({ name: u.name, Completed: u.completed, Pending: u.pending })) : [],
            empPerformanceData: !isDeptShape ? mapped.map(u => ({ name: u.name, Performance: u.onTimePct })) : [],
            aggregateDistribution
        };
    }, [reportData, globalReportData, user?.role, filters.employeeId, availableDepartments, topPerformer]);


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
        <div className="space-y-3" style={{ fontFamily: "'Aptos', sans-serif" }}>
            {/* ══ ANALYTICS EXECUTIVE LIGHT HERO ══ */}
            <div className="rounded-[1.2rem] bg-white shadow-sm relative border border-slate-100 px-4 py-2 overflow-hidden mb-2 group">
                {/* Clean Accents */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-40 group-hover:opacity-70 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-40 group-hover:opacity-70 transition-opacity" />

                <div className="relative z-10 flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-900 p-1.5 rounded-[0.6rem] shadow-sm">
                            <TrendingUp size={14} className="text-emerald-400" />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-[0.8rem] border border-slate-100 shadow-sm transition-all max-w-5xl">
                        {(user?.role === 'CFO' || user?.role === 'ADMIN') && (
                            <select
                                className="pl-4 pr-10 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-xl text-[10px] font-bold capitalize tracking-wider focus:outline-none focus:ring-4 focus:ring-emerald-500/10 appearance-none cursor-pointer hover:border-emerald-500/30 transition-all min-w-[150px] shadow-sm"
                                value={filters.departmentId}
                                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'3\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8rem' }}
                            >
                                <option value="">Department All</option>
                                {availableDepartments.map((d, idx) => {
                                    const val = typeof d === 'string' ? d : (d.department_id || d.id);
                                    const label = typeof d === 'string' ? d : (d.name || d.department_id);
                                    return <option key={`${val}-${idx}`} value={val}>{label}</option>
                                })}
                            </select>
                        )}

                        <select
                            className="pl-4 pr-10 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-xl text-[10px] font-bold capitalize tracking-wider focus:outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer hover:border-indigo-500/30 transition-all min-w-[150px] shadow-sm"
                            value={filters.employeeId}
                            onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'3\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8rem' }}
                        >
                            <option value="">All Personnel</option>
                            {availableEmployees.map((u, idx) => (
                                <option key={`${u.emp_id || u.id || idx}-${idx}`} value={u.emp_id || u.id}>{u.name}</option>
                            ))}
                        </select>

                        <div className="flex items-center gap-3 bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold text-slate-400 capitalize tracking-widest">From</span>
                                <input
                                    type="date"
                                    className="bg-transparent text-[10px] font-bold outline-none cursor-pointer text-slate-900 border-none p-0 focus:ring-0"
                                    value={filters.fromDate}
                                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                />
                            </div>
                            <div className="w-px h-6 bg-slate-100" />
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold text-slate-400 capitalize tracking-widest">To</span>
                                <input
                                    type="date"
                                    className="bg-transparent text-[10px] font-bold outline-none cursor-pointer text-slate-900 border-none p-0 focus:ring-0"
                                    value={filters.toDate}
                                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleDownloadPDF}
                                className="bg-slate-900 text-white hover:bg-slate-800 transition-all px-3 py-1 rounded-lg font-bold text-[8.5px] capitalize tracking-widest shadow-sm flex items-center gap-1.5 active:scale-95"
                            >
                                <Download size={11} className="text-indigo-400" /> PDF
                            </button>
                            <button
                                onClick={handleDownloadExcel}
                                className="bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm transition-all px-3 py-1 rounded-lg font-bold text-[8.5px] capitalize tracking-widest flex items-center gap-1.5 active:scale-95"
                            >
                                <FileSpreadsheet size={11} className="text-emerald-500" /> EXCEL
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── INSIGHT CARDS ── */}
            {isEmployee && employeeSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
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
                            <span className="text-xs font-bold opacity-60">/ {employeeSummary.dept_avg || 0}%</span>
                        </div>
                    </div>
                </div>
            ) : (
                (['ADMIN', 'CFO', 'MANAGER'].includes((user?.role || '').toUpperCase())) && (topList.length > 0 || workloadData?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        {topDept && (
                            <div className="mesh-gradient-emerald rounded-2xl p-4 border border-emerald-200/50 shadow-md flex flex-col justify-center relative overflow-hidden group/top card-gloss h-24">
                                <div className="absolute top-2 right-2 bg-emerald-500/10 p-1.5 rounded-lg">
                                    <TrendingUp size={18} className="text-emerald-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold capitalize tracking-[0.1em] text-emerald-600/70 mb-1">Leader</span>
                                    <span className="text-sm font-bold text-emerald-900 capitalize tracking-tight leading-none mb-1">{topDept.name}</span>
                                    <span className="text-2xl font-bold text-emerald-600 tabular-nums">{topDept.Performance}%</span>
                                </div>
                            </div>
                        )}

                        {underperformingDept && underperformingDept.name !== topDept?.name && (
                            <div className="mesh-gradient-rose rounded-2xl p-4 border border-rose-200/50 shadow-md flex flex-col justify-center relative overflow-hidden group/needs card-gloss h-24">
                                <div className="absolute top-2 right-2 bg-rose-500/10 p-1.5 rounded-lg">
                                    <TrendingDown size={18} className="text-rose-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold capitalize tracking-[0.1em] text-rose-600/70 mb-1">Intervention</span>
                                    <span className="text-sm font-bold text-rose-900 capitalize tracking-tight leading-none mb-1">{underperformingDept.name}</span>
                                    <span className="text-2xl font-bold text-rose-600 tabular-nums">{underperformingDept.Performance}%</span>
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
                                                <span className="text-[10px] font-bold text-slate-800 capitalize tracking-tight truncate">{d.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 pl-3">
                                                <span className="text-lg font-bold text-slate-900">{d.Total}</span>
                                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded-md">
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

            {/* ── CHARTS ROW - MOVED UP FOR VISIBILITY ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ChartPanel title="Department Top Performer">
                    {bestPerformer ? (
                        <div className="h-full flex flex-col justify-center items-center gap-4 py-4">
                            <div className="relative group">
                                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />
                                <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-800 font-black text-2xl shadow-xl border-4 border-slate-50 overflow-hidden">
                                    {bestPerformer.name && !bestPerformer.name.toLowerCase().includes('employee') ? (
                                        bestPerformer.name.charAt(0).toUpperCase()
                                    ) : (
                                        <User size={30} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                    <TrendingUp size={14} />
                                </div>
                            </div>
                            <div className="text-center">
                                <h4 className="font-black text-slate-800 text-lg capitalize tracking-tight">{bestPerformer.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 capitalize tracking-[0.2em]">{bestPerformer.department || bestPerformer.role || 'Personnel'}</p>
                            </div>
                            <div className="flex items-center gap-8 mt-2">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-1">Score</p>
                                    <p className="text-2xl font-black text-slate-900">{bestPerformer.score || bestPerformer.onTimePct}%</p>
                                </div>
                                <div className="w-px h-10 bg-slate-100" />
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-indigo-500 tracking-widest uppercase mb-1">Tasks</p>
                                    <p className="text-2xl font-black text-slate-900">{bestPerformer.completed || bestPerformer.completed_tasks || 0}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Users size={32} className="opacity-20 mb-2" />
                            <span className="text-[10px] font-bold capitalize tracking-widest">No performer data</span>
                        </div>
                    )}
                </ChartPanel>

                <TaskDistributionCard 
                    data={filters.employeeId ? (mapped.find(e => String(e.id) === String(filters.employeeId)) || aggregateDistribution) : aggregateDistribution}
                    title={filters.employeeId ? "Task Distribution (Personal)" : "Task Distribution (Aggregate)"}
                />

                {/* ── Manager: employee-wise charts ── */}
                {(user?.role || '').toUpperCase() === 'MANAGER' && (
                    <>
                        <ChartPanel title="Employee Workload Distribution">
                            {empWorkloadData.length > 0 ? (
                                <BarChart data={empWorkloadData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar dataKey="Completed" stackId="a" fill="#10b981" name="Completed" />
                                    <Bar dataKey="Pending" stackId="a" fill="#f59e0b" name="Pending" />
                                </BarChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <CheckSquare size={32} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-bold capitalize tracking-widest">No workload data</span>
                                </div>
                            )}
                        </ChartPanel>

                        <ChartPanel title="Employee Performance Index (%)">
                            {empPerformanceData.length > 0 ? (
                                <BarChart data={empPerformanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                    <Tooltip formatter={v => [`${v}%`, 'Completion Rate']} />
                                    <Bar dataKey="Performance" fill="#8b5cf6" name="Performance %" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <TrendingUp size={32} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-bold capitalize tracking-widest">No performance data</span>
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
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} 
                                        tickFormatter={(val) => {
                                            const [y, m] = val.split('-');
                                            return new Date(y, m - 1).toLocaleString('default', { month: 'short' });
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#8b5cf6' }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} />
                                    <Bar yAxisId="left" dataKey="completed_tasks" fill="#10b981" name="Approved Tasks" radius={[4, 4, 0, 0]} barSize={30} />
                                    <Line yAxisId="right" type="monotone" dataKey="score" stroke="#8b5cf6" name="Performance Score %" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                                </ComposedChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <TrendingUp size={32} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-bold capitalize tracking-widest">No trend data available</span>
                                </div>
                            )}
                        </ChartPanel>
                    </>
                )}

                {/* ── CFO / Admin: dept-wise charts ── */}
                {(['ADMIN', 'CFO'].includes((user?.role || '').toUpperCase())) && (
                    <>
                        <ChartPanel title="Division Workload Distribution">
                            {workloadData.length > 0 ? (
                                <BarChart data={workloadData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar dataKey="Completed" stackId="a" fill="#10b981" name="Completed" />
                                    <Bar dataKey="Pending" stackId="a" fill="#f59e0b" name="Pending" />
                                </BarChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <CheckSquare size={32} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-bold capitalize tracking-widest">No workload data</span>
                                </div>
                            )}
                        </ChartPanel>

                        <ChartPanel title="Perf. Index (%)">
                            {deptScores.length > 0 ? (
                                <BarChart data={deptScores}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Bar dataKey="Performance" fill="#8b5cf6" name="Rate %" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <TrendingUp size={32} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-bold capitalize tracking-widest">No performance data</span>
                                </div>
                            )}
                        </ChartPanel>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 capitalize tracking-tight">Performance Report</h3>
                        </div>
                        <button
                            onClick={() => setFilters({ employeeId: '', departmentId: '', fromDate: '', toDate: '' })}
                            className="text-[9px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg hover:bg-violet-100 transition-colors"
                        >
                            RESET
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/80 text-slate-500 text-[9px] capitalize font-bold tracking-widest border-b border-slate-200/60">
                                <tr>
                                    <th className="px-3 py-2">Employee</th>
                                    <th className="px-3 py-2 text-center">Total</th>
                                    <th className="px-3 py-3 text-center">Done</th>
                                    <th className="px-3 py-2 text-center">On-Time %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                                {performanceData.length > 0 ? (
                                    performanceData.map((row, idx) => (
                                        <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-0 group">
                                            <td className="px-3 py-1.5">
                                                <div className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors">{row.name}</div>
                                                <div className="text-[8px] text-slate-400 font-bold capitalize tracking-widest">{row.department}</div>
                                            </td>
                                            <td className="px-3 py-1.5 text-center font-extrabold text-slate-600 tabular-nums">{row.total}</td>
                                            <td className="px-3 py-1.5 text-center">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold text-[9px]">
                                                    {row.completed}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <div className="flex items-center gap-2 justify-center">
                                                    <span className="text-[9px] font-extrabold text-slate-700 tabular-nums">{row.onTimePct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="py-4 text-center text-slate-400 italic">No data found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/30">
                        <h3 className="text-sm font-bold text-slate-800 capitalize tracking-tight">Top High Performers</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-500 text-[9px] capitalize font-bold tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-3 py-2">Rank</th>
                                    <th className="px-3 py-2">Entity</th>
                                    <th className="px-3 py-2 text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                                {topList.length > 0 ? topList.map((emp, i) => (
                                    <tr key={`${emp.id}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-3 py-1.5">
                                            <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[9px] ${i === 0 ? 'bg-amber-100 text-amber-600' :
                                                i === 1 ? 'bg-slate-100 text-slate-500' :
                                                    i === 2 ? 'bg-orange-50 text-orange-600' :
                                                        'bg-slate-50 text-slate-400'
                                                }`}>
                                                {i + 1}
                                            </div>
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <div className="font-bold text-slate-800">{emp.name}</div>
                                            <div className="text-[8px] text-slate-400 font-bold capitalize tracking-tighter">{emp.role}</div>
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-bold text-violet-600 tabular-nums">
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
    );
};

const PieChart2 = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
);

export default ReportsPage;
