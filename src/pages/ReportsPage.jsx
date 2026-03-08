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
            const res = await fetch(`${baseURL}${path}`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    'ngrok-skip-browser-warning': 'true',
                },
            });
            if (res.status === 422 || res.status === 404 || res.status === 405) {
                continue;
            }
            if (!res.ok) continue;
            const data = await res.json();
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
    const [loading, setLoading] = useState(false);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const role = (user?.role || '').toUpperCase();
            const isCFO = role === 'CFO' || role === 'ADMIN';

            const endpoint = isCFO
                ? '/dashboard/cfo'
                : '/manager/reports';

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

            const stats = payload?.department_stats
                || payload?.manager_stats
                || payload?.performance_data
                || payload?.stats
                || (Array.isArray(payload) ? payload : []);

            if (Array.isArray(stats) && stats.length > 0) {
                setReportData(stats);
                return;
            }

            // Fallback: derive report rows from real DB tasks when report endpoint is empty.
            const rawTasks = await fetchTasksForReports(isCFO);

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
                filtered.forEach((t) => {
                    const key = t.departmentId || t.departmentName || 'N/A';
                    const existing = byDept.get(key) || {
                        department_id: t.departmentName || key,
                        total_tasks: 0,
                        approved_tasks: 0,
                        pending_tasks: 0,
                        avg_reworks: 0,
                        _reworks: 0,
                    };
                    existing.total_tasks += 1;
                    if (t.status === 'APPROVED') existing.approved_tasks += 1;
                    if (!TERMINAL_STATUSES.has(t.status)) existing.pending_tasks += 1;
                    if (t.status === 'REWORK') existing._reworks += 1;
                    byDept.set(key, existing);
                });

                const deptRows = Array.from(byDept.values()).map((d) => ({
                    ...d,
                    avg_reworks: d.total_tasks > 0 ? Number((d._reworks / d.total_tasks).toFixed(2)) : 0,
                }));
                setReportData(deptRows);
            } else {
                const byEmp = new Map();
                filtered.forEach((t) => {
                    const key = t.employeeId || t.employeeName;
                    const existing = byEmp.get(key) || {
                        emp_id: t.employeeId || key,
                        name: t.employeeName,
                        department: t.departmentName,
                        role: 'Employee',
                        tasks_assigned: 0,
                        tasks_completed: 0,
                        avg_reworks: 0,
                        _reworks: 0,
                    };
                    existing.tasks_assigned += 1;
                    if (t.status === 'APPROVED') existing.tasks_completed += 1;
                    if (t.status === 'REWORK') existing._reworks += 1;
                    byEmp.set(key, existing);
                });

                const empRows = Array.from(byEmp.values()).map((e) => ({
                    ...e,
                    avg_reworks: e.tasks_assigned > 0 ? Number((e._reworks / e.tasks_assigned).toFixed(2)) : 0,
                }));
                setReportData(empRows);
            }
        } catch (err) {
            console.error("Failed to fetch reports", err);
            setReportData([]);
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

        // Use real data if available
        const hasData = Array.isArray(reportData) && reportData.length > 0;
        const arr = hasData ? reportData : [];

        if (!hasData) return empty;

        // Determine shape by checking first element
        const isDeptShape = arr[0] && ('department_id' in arr[0]);

        const mapped = isDeptShape
            ? arr.map(d => ({
                id: d.department_id,
                name: d.department_id,
                role: 'Department',
                department: d.department_id,
                total: d.total_tasks || 0,
                completed: d.approved_tasks || 0,
                pending: d.pending_tasks || 0,
                onTimePct: d.total_tasks > 0 ? Math.round((d.approved_tasks / d.total_tasks) * 100) : 0,
                avgReworks: d.avg_reworks || 0,
                score: d.total_tasks > 0 ? Math.round((d.approved_tasks / d.total_tasks) * 100) : 0,
                manager: 'Dept Head'
            }))
            : arr.map(u => ({
                id: u.emp_id || u.id,
                name: u.name,
                role: u.role || 'Employee',
                department: u.department || u.department_name || 'N/A',
                total: u.tasks_assigned || u.total_tasks || 0,
                completed: u.tasks_completed || u.approved_tasks || 0,
                pending: Math.max(0, (u.tasks_assigned || u.total_tasks || 0) - (u.tasks_completed || u.approved_tasks || 0)),
                onTimePct: (u.tasks_assigned || u.total_tasks) > 0
                    ? Math.round(((u.tasks_completed || u.approved_tasks) / (u.tasks_assigned || u.total_tasks)) * 100)
                    : 0,
                avgReworks: u.avg_reworks || 0,
                score: (u.tasks_assigned || u.total_tasks) > 0
                    ? Math.round(((u.tasks_completed || u.approved_tasks) / (u.tasks_assigned || u.total_tasks)) * 100)
                    : 0,
                manager: u.manager_name || 'Supervisor'
            }));

        const sorted = [...mapped].sort((a, b) => b.onTimePct - a.onTimePct);

        return {
            performanceData: mapped,
            topList: sorted.slice(0, 5),
            deptScores: isDeptShape ? mapped.map(d => ({ name: d.name, Performance: d.onTimePct })) : [],
            topDept: isDeptShape && sorted[0] ? { name: sorted[0].name, Performance: sorted[0].onTimePct, Tasks: sorted[0].total } : (sorted[0] ? { name: sorted[0].name, Performance: sorted[0].onTimePct, Tasks: sorted[0].total } : null),
            underperformingDept: sorted.length > 1 ? { name: sorted[sorted.length - 1].name, Performance: sorted[sorted.length - 1].onTimePct, Tasks: sorted[sorted.length - 1].total } : null,
            workloadData: isDeptShape ? mapped.map(d => ({ name: d.name, Total: d.total, Completed: d.completed, Pending: d.pending })) : mapped.map(u => ({ name: u.name, Total: u.total, Completed: u.completed, Pending: u.pending })),
            empWorkloadData: !isDeptShape ? mapped.map(u => ({ name: u.name, Completed: u.completed, Pending: u.pending })) : [],
            empPerformanceData: !isDeptShape ? mapped.map(u => ({ name: u.name, Performance: u.onTimePct })) : [],
        };
    }, [reportData, user?.role]);


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
        <div className="space-y-4">
            {/* ══ ANALYTICS PREMIUM HERO ══ */}
            <div
                className="rounded-3xl overflow-hidden shadow-2xl relative mb-6"
                style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 40%, #475569 100%)' }}
            >
                {/* Decorative Premium Blobs */}
                <div className="glass-circle w-64 h-64 bg-white/5 -top-10 -right-10 animate-blob" />
                <div className="glass-circle w-48 h-48 bg-white/5 bottom-0 left-1/4 animate-blob [animation-delay:2s]" />

                <div className="relative z-10 px-8 py-10 flex flex-col items-center text-center gap-6">
                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/20 animate-float">
                            <TrendingUp size={32} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">
                                Performance Analytics
                            </h2>
                            <p className="text-slate-300 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 opacity-80">
                                {(user?.role || '').toUpperCase() === 'MANAGER' ? 'Departmental Metrics & KPI Tracking' : 'Enterprise Intelligence & System Reports'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-5xl">
                        {/* Global Filters Group - Premium Glass */}
                        <div className="flex flex-wrap items-center gap-3 bg-white/5 backdrop-blur-xl p-3 rounded-[2rem] border border-white/10 shadow-2xl flex-1 justify-center">

                            {(user?.role === 'CFO' || user?.role === 'ADMIN') && (
                                <select
                                    className="pl-4 pr-10 py-3 bg-white/10 text-white border border-white/20 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-white/10 appearance-none cursor-pointer hover:bg-white/20 transition-all min-w-[160px]"
                                    value={filters.departmentId}
                                    onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                                >
                                    <option value="" className="text-slate-900">All Departments</option>
                                    {availableDepartments.map((d, idx) => {
                                        const val = typeof d === 'string' ? d : (d.department_id || d.id);
                                        const label = typeof d === 'string' ? d : (d.name || d.department_id);
                                        return <option key={`${val}-${idx}`} value={val} className="text-slate-900">{label}</option>
                                    })}
                                </select>
                            )}

                            <select
                                className="pl-4 pr-10 py-3 bg-white/10 text-white border border-white/20 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-white/10 appearance-none cursor-pointer hover:bg-white/20 transition-all min-w-[160px]"
                                value={filters.employeeId}
                                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                            >
                                <option value="" className="text-slate-900">All Personnel</option>
                                {availableEmployees.map((u, idx) => (
                                    <option key={`${u.emp_id || u.id || idx}-${idx}`} value={u.emp_id || u.id} className="text-slate-900">{u.name}</option>
                                ))}
                            </select>

                            {/* Date Picker Range */}
                            <div className="flex items-center gap-3 bg-white/10 px-5 py-2.5 rounded-2xl border border-white/20 shadow-inner">
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-1">From</span>
                                    <input
                                        type="date"
                                        className="bg-transparent text-[11px] font-bold outline-none cursor-pointer text-white color-scheme-dark"
                                        value={filters.fromDate}
                                        onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                    />
                                </div>
                                <ArrowRight size={10} className="text-white/30" />
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-1">To</span>
                                    <input
                                        type="date"
                                        className="bg-transparent text-[11px] font-bold outline-none cursor-pointer text-white color-scheme-dark"
                                        value={filters.toDate}
                                        onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Export Actions */}
                            <div className="flex items-center gap-2 ml-2">
                                <button
                                    onClick={handleDownloadPDF}
                                    className="bg-white text-slate-900 hover:bg-slate-100 transition-all px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"
                                >
                                    <Download size={14} /> PDF
                                </button>
                                <button
                                    onClick={handleDownloadExcel}
                                    className="bg-emerald-500 text-white hover:bg-emerald-600 transition-all px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"
                                >
                                    <FileSpreadsheet size={14} /> CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── INSIGHT CARDS - PREMIUM REVAMP ── */}
            {(['ADMIN', 'CFO'].includes((user?.role || '').toUpperCase())) && (topList.length > 0 || workloadData?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    {topDept && (
                        <div className="mesh-gradient-emerald rounded-3xl p-6 border border-emerald-200/50 shadow-xl shadow-emerald-900/5 flex flex-col justify-center relative overflow-hidden group/top card-gloss">
                            <div className="absolute top-4 right-4 bg-emerald-500/10 p-2 rounded-xl group-hover/top:scale-110 transition-transform">
                                <TrendingUp size={24} className="text-emerald-600" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/70 mb-2">Performance Leader</span>
                                <div className="flex flex-col">
                                    <span className="text-xl font-black text-emerald-900 uppercase tracking-tight leading-none mb-1 group-hover/top:translate-x-1 transition-transform">{topDept.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl font-black text-emerald-600 tabular-nums">{topDept.Performance}%</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {underperformingDept && underperformingDept.name !== topDept?.name && (
                        <div className="mesh-gradient-rose rounded-3xl p-6 border border-rose-200/50 shadow-xl shadow-rose-900/5 flex flex-col justify-center relative overflow-hidden group/needs card-gloss">
                            <div className="absolute top-4 right-4 bg-rose-500/10 p-2 rounded-xl group-hover/needs:scale-110 transition-transform">
                                <TrendingDown size={24} className="text-rose-600" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600/70 mb-2">Needs Intervention</span>
                                <div className="flex flex-col">
                                    <span className="text-xl font-black text-rose-900 uppercase tracking-tight leading-none mb-1 group-hover/needs:translate-x-1 transition-transform">{underperformingDept.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl font-black text-rose-600 tabular-nums">{underperformingDept.Performance}%</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {workloadData?.length > 0 && (
                        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/60 shadow-lg relative overflow-hidden group/work mesh-gradient">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Workload Summary</span>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {workloadData.map((d, idx) => (
                                    <div key={`${d.name}-${idx}`} className="flex flex-col gap-1 group/item cursor-default">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-violet-500 group-hover/item:scale-125 transition-transform" />
                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{d.name}</span>
                                        </div>
                                        <div className="flex flex-col items-baseline gap-0.5 pl-4">
                                            <span className="text-lg font-black text-slate-900">{d.Total}</span>
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                                                {d.Pending} Pending
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
                                    <span className="text-[10px] font-black uppercase tracking-widest">No workload data</span>
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
                                    <span className="text-[10px] font-black uppercase tracking-widest">No performance data</span>
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
                                    <span className="text-[10px] font-black uppercase tracking-widest">No workload data</span>
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
                                    <span className="text-[10px] font-black uppercase tracking-widest">No performance data</span>
                                </div>
                            )}
                        </ChartPanel>
                    </>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                        <div className="flex-shrink-0">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Performance Report</h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">Filter and download metrics</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1 lg:flex-none">
                            <div className="flex items-center gap-3">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Filters active in Global Analytics Header
                                </div>
                                <button
                                    onClick={() => setFilters({ employeeId: '', departmentId: '', fromDate: '', toDate: '' })}
                                    className="text-[10px] font-black text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
                                >
                                    RESET ALL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-200/60">
                            <tr>
                                <th className="px-4 py-3">Employee</th>
                                <th className="px-4 py-3 text-center">Total</th>
                                <th className="px-4 py-3 text-center">Done</th>
                                <th className="px-4 py-3 text-center">Pending</th>
                                <th className="px-4 py-3 text-center font-bold">On-Time %</th>
                                <th className="px-4 py-3 text-right pr-6">Avg Reworks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                            {performanceData.length > 0 ? (
                                performanceData.map((row, idx) => (
                                    <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-0 group">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors text-xs">{row.name}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{row.department}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-extrabold text-slate-600 tabular-nums text-xs">{row.total}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-bold text-[10px]">
                                                {row.completed}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-orange-500 tabular-nums text-xs">{row.pending}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 justify-center max-w-[120px] mx-auto">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-700 ${row.onTimePct >= 80 ? 'bg-emerald-500' : row.onTimePct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${row.onTimePct}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] font-extrabold text-slate-700 tabular-nums">{row.onTimePct}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-500 tabular-nums pr-6 text-xs">{row.avgReworks}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        No performance data found for the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/30">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Top High Performers</h3>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">Top performing entities by completion rate</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3">Rank</th>
                                <th className="px-4 py-3">Entity</th>
                                <th className="px-4 py-3">Dept</th>
                                <th className="px-4 py-3">Supervisor</th>
                                <th className="px-4 py-3 text-right">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {topList.length > 0 ? topList.map((emp, i) => (
                                <tr key={`${emp.id}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-2">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${i === 0 ? 'bg-amber-100 text-amber-600' :
                                            i === 1 ? 'bg-slate-100 text-slate-500' :
                                                i === 2 ? 'bg-orange-50 text-orange-600' :
                                                    'bg-slate-50 text-slate-400'
                                            }`}>
                                            {i + 1}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="font-bold text-slate-800">{emp.name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{emp.role}</div>
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">{emp.department}</td>
                                    <td className="px-4 py-2 text-slate-400 italic text-[10px]">{emp.manager || 'No Data'}</td>
                                    <td className="px-4 py-2 text-right font-bold text-violet-600 tabular-nums">
                                        {emp.score}%
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-slate-400 italic">
                                        No ranking data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
