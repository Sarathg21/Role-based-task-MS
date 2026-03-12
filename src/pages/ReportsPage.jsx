import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getEmployeeRankings } from '../utils/rankingEngine';
import ChartPanel from '../components/Charts/ChartPanel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileSpreadsheet, TrendingUp, TrendingDown, Calendar, ArrowRight, CheckSquare } from 'lucide-react';

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

    const [reportData, setReportData] = useState(null);
    const [globalReportData, setGlobalReportData] = useState([]); // Unfiltered by Dept/Emp
    const [loading, setLoading] = useState(false);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const role = (user?.role || '').toUpperCase();
            const isCFO = role === 'CFO' || role === 'ADMIN';
            const isManager = role === 'MANAGER';
            const isEmployee = role === 'EMPLOYEE';

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

            const normalizedTasks = rawTasks.map((t) => ({
                id: t.task_id || t.id,
                employeeId: String(t.assigned_to_emp_id || t.employee_id || ''),
                employeeName: t.assigned_to_name || t.assignee_name || t.employee_name || 'Unassigned',
                departmentId: String(t.department_id || ''),
                departmentName: t.department_name || t.department || 'N/A',
                status: String(t.status || '').toUpperCase(),
                dateKey: toDateKey(t.assigned_date || t.created_at || t.due_date),
            }));

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

                // Global Stats (Date filter only)
                normalizedTasks.filter(t => inRange(t.dateKey, filters.fromDate, filters.toDate)).forEach(t => {
                    const key = t.departmentName || 'N/A';
                    const existing = globalByDept.get(key) || { department_id: key, total_tasks: 0, approved_tasks: 0, pending_tasks: 0, avg_reworks: 0, _reworks: 0 };
                    existing.total_tasks += 1;
                    if (t.status === 'APPROVED') existing.approved_tasks += 1;
                    if (!TERMINAL_STATUSES.has(t.status)) existing.pending_tasks += 1;
                    if (t.status === 'REWORK') existing._reworks += 1;
                    globalByDept.set(key, existing);
                });

                // Filtered Stats (Dept/Emp/Date filters)
                filtered.forEach((t) => {
                    const key = t.departmentName || 'N/A';
                    const existing = byDept.get(key) || { department_id: key, total_tasks: 0, approved_tasks: 0, pending_tasks: 0, avg_reworks: 0, _reworks: 0 };
                    existing.total_tasks += 1;
                    if (t.status === 'APPROVED') existing.approved_tasks += 1;
                    if (!TERMINAL_STATUSES.has(t.status)) existing.pending_tasks += 1;
                    if (t.status === 'REWORK') existing._reworks += 1;
                    byDept.set(key, existing);
                });

                setReportData(Array.from(byDept.values()).filter(d => d.total_tasks > 0 || !filters.departmentId));
                setGlobalReportData(Array.from(globalByDept.values()));
            } else {
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
                    };
                    existing.total_tasks += 1;
                    if (t.status === 'APPROVED') existing.approved_tasks += 1;
                    if (!TERMINAL_STATUSES.has(t.status)) existing.pending_tasks += 1;
                    if (t.status === 'REWORK') existing._reworks += 1;
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

    const { topList, performanceData, deptScores, topDept, underperformingDept, workloadData, empWorkloadData, empPerformanceData } = useMemo(() => {
        const empty = {
            topList: [], performanceData: [], deptScores: [],
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
                manager: item.manager_name || 'Supervisor'
            };
        });

        const globalMapped = (Array.isArray(globalReportData) && globalReportData.length > 0 ? globalReportData : []).map(item => {
            const total = Number(item.total_tasks || item.total || item.tasks_assigned || item.tasks_count || 0);
            const completed = Number(item.approved_tasks || item.approved || item.tasks_completed || item.tasks_done || item.completed || 0);
            const pending = Number(item.pending_tasks || item.pending || (total - completed) || 0);

            let onTimePct = Number(item.on_time_pct || item.performance || item.performance_index || item.completion_rate || 0);
            if (onTimePct === 0 && total > 0) {
                onTimePct = Math.round((completed / total) * 100);
            }

            return {
                name: item.name || item.employee_name || item.department_name || item.department_id || 'Unit',
                total,
                completed,
                pending: Math.max(0, pending),
                onTimePct
            };
        });

        const sorted = [...mapped].sort((a, b) => b.onTimePct - a.onTimePct);

        return {
            performanceData: mapped,
            topList: sorted.slice(0, 5),
            deptScores: isDeptShape ? globalMapped.map(d => ({ name: d.name, Performance: d.onTimePct })) : [],
            topDept: sorted[0] ? { name: sorted[0].name, Performance: sorted[0].onTimePct, Tasks: sorted[0].total } : null,
            underperformingDept: sorted.length > 1 ? { name: sorted[sorted.length - 1].name, Performance: sorted[sorted.length - 1].onTimePct, Tasks: sorted[sorted.length - 1].total } : null,
            workloadData: isDeptShape ? globalMapped.map(d => ({ name: d.name, Total: d.total, Completed: d.completed, Pending: d.pending })) : mapped.map(d => ({ name: d.name, Total: d.total, Completed: d.completed, Pending: d.pending })),
            empWorkloadData: !isDeptShape ? mapped.map(u => ({ name: u.name, Completed: u.completed, Pending: u.pending })) : [],
            empPerformanceData: !isDeptShape ? mapped.map(u => ({ name: u.name, Performance: u.onTimePct })) : [],
        };
    }, [reportData, globalReportData, user?.role, filters.employeeId, availableDepartments]);


    const downloadFile = async (format) => {
        try {
            const params = new URLSearchParams({
                from_date: filters.fromDate || '',
                to_date: filters.toDate || ''
            });
            if (filters.departmentId) params.append('department_id', filters.departmentId);
            if (filters.employeeId) params.append('employee_id', filters.employeeId);

            const url = `${api.defaults.baseURL}/reports/performance.${format}?${params.toString()}`;

            // Use JWT Bearer token (not legacy X-EMP-ID)
            const token = localStorage.getItem('pms_token');
            const response = await fetch(url, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `performance_report_${filters.fromDate || 'all'}_to_${filters.toDate || 'now'}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);

        } catch (err) {
            console.error(`Failed to download ${format}`, err);
            alert(`Failed to download ${format} report`);
        }
    };

    const handleDownloadPDF = () => downloadFile('pdf');
    const handleDownloadExcel = () => downloadFile('csv'); // Backend uses .csv for Excel button in mock, adjusting to .csv/xlsx

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
                                <FileSpreadsheet size={11} className="text-emerald-500" /> CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── INSIGHT CARDS ── */}
            {(['ADMIN', 'CFO', 'MANAGER', 'EMPLOYEE'].includes((user?.role || '').toUpperCase())) && (topList.length > 0 || workloadData?.length > 0) && (
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
            )}

            {/* ── CHARTS ROW - MOVED UP FOR VISIBILITY ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ── Manager: employee-wise charts ── */}
                {(user?.role || '').toUpperCase() === 'MANAGER' && (
                    <>
                        <ChartPanel title="Employee Workload Distribution">
                            {empWorkloadData.length > 0 ? (
                                <BarChart data={empWorkloadData}>
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

                        <ChartPanel title="Employee Performance Index (%)">
                            {empPerformanceData.length > 0 ? (
                                <BarChart data={empPerformanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
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
                        <ChartPanel title="Personal Performance Trend">
                            {performanceData.length > 0 ? (
                                <BarChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" hide />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip formatter={v => [`${v}%`, 'Score']} />
                                    <Bar dataKey="onTimePct" fill="#8b5cf6" name="Performance %" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <TrendingUp size={32} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-bold capitalize tracking-widest">No trend data</span>
                                </div>
                            )}
                        </ChartPanel>

                        <ChartPanel title="Task Distribution (Personal)">
                            {performanceData.length > 0 ? (
                                <BarChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" hide />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar dataKey="completed" fill="#10b981" name="Completed" />
                                    <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                                </BarChart>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <CheckSquare size={32} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-bold capitalize tracking-widest">No task data</span>
                                </div>
                            )}
                        </ChartPanel>
                    </>
                )}

                {/* ── CFO / Admin: dept-wise charts ── */}
                {(['ADMIN', 'CFO'].includes((user?.role || '').toUpperCase())) && (
                    <>
                        <ChartPanel title="Workload (Dept)">
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

export default ReportsPage;
