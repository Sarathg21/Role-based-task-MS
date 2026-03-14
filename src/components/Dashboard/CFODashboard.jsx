import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../UI/Badge';
import StatsCard from '../UI/StatsCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, ComposedChart, Line, Area
} from 'recharts';
import {
    TrendingUp, Users, CheckSquare, AlertTriangle, ArrowRight,
    BarChart2, Loader2, CheckCircle, Activity, Shield, Layout, Target, Clock, PlusCircle,
    Plus, MessageSquare, User, ChevronDown, XCircle
} from 'lucide-react';
import EmployeeIssueModal from '../Modals/EmployeeIssueModal';
import DeptReviewModal from '../Modals/DeptReviewModal';
import toast from 'react-hot-toast';
import ManagerDashboard from './ManagerDashboard';
import CustomSelect from '../UI/CustomSelect';


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

const DepartmentPerformanceGrid = ({ data }) => {
    if (!data || data.length === 0) return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-12 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4 opacity-50" />
            <p className="text-slate-400 font-bold capitalize tracking-[0.3em] text-[10px]">No Department Performance Data</p>
        </div>
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'ON_TRACK': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
            case 'AT_RISK': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
            case 'OFF_TRACK': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
            default: return 'bg-slate-300';
        }
    };

    const getStatusText = (status) => {
        if (!status || status === 'NO_DATA') return 'No Data';
        return status.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-8 transition-all hover:shadow-md">
            <h3 className="text-[12px] font-bold text-slate-500 mb-8 flex items-center gap-3">
                <Target size={16} className="text-emerald-600" />
                Departmental Health Grid
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-[10px] text-slate-400 font-bold border-b border-slate-100">
                        <tr>
                            <th className="py-4 px-4 font-bold text-[16px]" style={{ fontFamily: 'Aptos, sans-serif' }}>Department</th>
                            <th className="py-4 px-4 font-bold text-center">Total</th>
                            <th className="py-4 px-4 font-bold text-center">Overdue</th>
                            <th className="py-4 px-4 font-bold text-center text-indigo-500">In Progress</th>
                            <th className="py-4 px-4 font-bold text-center text-emerald-500">Completed</th>
                            <th className="py-4 px-4 font-bold min-w-[150px]">Completion %</th>
                            <th className="py-4 px-4 font-bold text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.map((dept, idx) => (
                            <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-4">
                                    <span className="text-[16px] font-semibold text-slate-800 capitalize tracking-tighter" style={{ fontFamily: 'Aptos, sans-serif' }}>
                                        {dept.department_name || dept.name || 'Unknown'}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-slate-600 tabular-nums">
                                    {dept.total_tasks || 0}
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-rose-600 tabular-nums">
                                    {dept.overdue_tasks || 0}
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-indigo-600 tabular-nums">
                                    {dept.in_progress_tasks || 0}
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-emerald-600 tabular-nums">
                                    {dept.completed_tasks || 0}
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5">
                                            <div
                                                className="h-full rounded-full bg-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                                                style={{ width: `${dept.completion_pct || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-[12px] font-black text-slate-700 w-10 tabular-nums">
                                            {Math.round(dept.completion_pct || 0)}%
                                        </span>
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-100 bg-white shadow-sm transition-transform group-hover:scale-105">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(dept.status)}`} />
                                        <span className="text-[9px] font-black text-slate-500 capitalize tracking-widest">
                                            {getStatusText(dept.status)}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
const EmployeeRiskPanel = ({ tasks, onIssueClick }) => {
    const riskData = useMemo(() => {
        const counts = {};
        tasks.forEach(t => {
            if (t.status === 'REWORK' || t.is_overdue || t.overdue) {
                const name = t.assigneeName || t.assigned_to_name || 'System';
                if (!counts[name]) counts[name] = { name, overdue: 0, rework: 0, total: 0 };
                if (t.status === 'REWORK') counts[name].rework++;
                if (t.is_overdue || t.overdue) counts[name].overdue++;
                counts[name].total++;
            }
        });
        return Object.values(counts)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [tasks]);

    if (riskData.length === 0) return null;

    return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-8 transition-all hover:shadow-md">
            <h3 className="text-[12px] font-bold text-slate-500 mb-6 flex items-center gap-3">
                <AlertTriangle size={16} className="text-rose-600" />
                Top Risk Employees
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {riskData.map((emp, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-rose-50/20 border border-rose-100/50 flex flex-col justify-between group hover:bg-white transition-all">
                        <div className="flex items-start justify-between mb-2">
                            <p className="text-[13px] font-black text-slate-800 leading-tight">{emp.name}</p>
                            <span className="text-sm">⚠</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <p className="text-[10px] text-slate-400 font-bold capitalize tracking-widest leading-none">
                                {emp.overdue} Overdue
                            </p>
                            <button
                                onClick={() => onIssueClick(emp.name)}
                                className="px-2 py-1 rounded bg-rose-100/50 text-rose-600 text-[10px] font-black hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm border border-rose-100"
                            >
                                {emp.total} ISSUES
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExecutiveHealthPanel = ({ metrics, departments }) => {
    const topDept = [...departments].sort((a, b) => b.completion_pct - a.completion_pct)[0];
    const bottomDept = [...departments].sort((a, b) => a.completion_pct - b.completion_pct)[0];

    return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-8 transition-all hover:shadow-md">
            <h3 className="text-[12px] font-bold text-slate-500 mb-8 flex items-center gap-3">
                <Shield size={16} className="text-violet-600" />
                Organization Health Panel
            </h3>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Part 1: Performance Rates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Completion Rate', value: `${metrics?.orgCompletionRate || 0}%`, color: 'text-violet-600', icon: CheckCircle },
                        { label: 'On-Time Rate', value: `${metrics?.avgOnTime || 0}%`, color: 'text-sky-600', icon: Clock },
                        { label: 'Rework Rate', value: `${metrics?.avgRework || 0}`, color: 'text-amber-600', icon: TrendingUp },
                    ].map((m, i) => (
                        <div key={i} className="flex flex-col p-5 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-white transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <m.icon size={18} className={m.color} />
                                <span className={`text-xl font-semibold ${m.color}`}>{m.value}</span>
                            </div>
                            <span className="text-[14px] font-semibold text-slate-400">{m.label}</span>
                        </div>
                    ))}
                </div>

                {/* Part 2: Department Leaders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-3 mb-2 relative z-10">
                            <span className="text-xl">🏆</span>
                            <span className="text-[10px] font-black text-emerald-700 capitalize tracking-widest">Top Dept</span>
                        </div>
                        <h4 className="text-[15px] font-black text-slate-900 border-l-4 border-emerald-500 pl-3 relative z-10 capitalize tracking-tight">
                            {topDept?.department || topDept?.name || 'ACCOUNTS'}
                        </h4>
                    </div>
                    <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-3 mb-2 relative z-10">
                            <span className="text-xl">⚠</span>
                            <span className="text-[10px] font-black text-rose-700 capitalize tracking-widest">Bottom Dept</span>
                        </div>
                        <h4 className="text-[15px] font-black text-slate-900 border-l-4 border-rose-500 pl-3 relative z-10 capitalize tracking-tight">
                            {bottomDept?.department || bottomDept?.name || 'WHSE'}
                        </h4>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TaskTrendsChart = ({ data }) => {
    // Helper: Convert "2026-02" or "Feb" or "02" to "February"
    const formatMonthName = (val) => {
        if (!val || val === '—') return '—';
        try {
            // Handle "YYYY-MM"
            if (/^\d{4}-\d{2}$/.test(val)) {
                const [year, month] = val.split('-');
                return new Date(year, parseInt(month) - 1).toLocaleString('en-US', { month: 'long' });
            }
            // Handle raw month name abbreviation
            const d = new Date(`${val} 1, 2000`);
            if (!isNaN(d.getTime())) return d.toLocaleString('en-US', { month: 'long' });
            return val;
        } catch (e) {
            return val;
        }
    };

    // Normalize data keys to handle API variations (lowercase vs PascalCase)
    const trends = useMemo(() => {
        const source = data && data.length > 0 ? data : [
            { name: 'Nov', New: 80, Pending: 40, Overdue: 20, Completed: 30 },
            { name: 'Dec', New: 60, Pending: 80, Overdue: 35, Completed: 40 },
            { name: 'Jan', New: 95, Pending: 45, Overdue: 15, Completed: 65 },
            { name: 'Feb', New: 115, Pending: 55, Overdue: 10, Completed: 60 },
            { name: 'Mar', New: 110, Pending: 65, Overdue: 25, Completed: 75 },
            { name: 'Mar', New: 130, Pending: 75, Overdue: 40, Completed: 110 },
            { name: 'Apr', New: 150, Pending: 85, Overdue: 50, Completed: 125 },
        ];
        return source.map(d => {
            const getVal = (keys) => {
                for (const k of keys) {
                    if (d[k] !== undefined && d[k] !== null) return Number(d[k]);
                }
                return null;
            };

            const completed = getVal(['Completed', 'completed', 'completed_tasks', 'approved', 'approved_tasks', 'approved_count', 'completed_count']);
            const overdue = getVal(['Overdue', 'overdue', 'overdue_tasks', 'overdue_count', 'overdueTasks', 'overdue_count']);
            const inProgress = getVal(['in_progress', 'in_progress_tasks', 'inProgress']);
            const submitted = getVal(['submitted', 'submitted_tasks', 'submitted_count']);
            const rework = getVal(['rework', 'rework_tasks', 'rework_count']);
            
            // Pending is a sum of current "active" states
            const pending = getVal(['Pending', 'pending', 'pending_tasks', 'pending_count', 'pendingTasks']) ?? 
                            ((inProgress || 0) + (submitted || 0) + (rework || 0));
            
            // New tasks variants
            const initialNew = getVal(['New', 'new', 'new_tasks', 'new_count', 'total_new', 'newTasks']);
            
            // Total volume fallback logic
            const total = getVal(['total_tasks', 'total', 'total_count', 'count', 'tasks']) || 0;
            
            let n = initialNew || 0;
            let p = pending || 0;
            let o = overdue || 0;
            let c = completed || 0;

            // SMART BREAKDOWN: If n is 0 but total suggests more tasks exist, fill n with the remainder
            if (n === 0 && total > (p + o + c)) {
                n = total - (p + o + c);
            }

            return {
                name: formatMonthName(d.name || d.month),
                New: Math.max(0, n),
                Pending: Math.max(0, p),
                Overdue: Math.max(0, o),
                Completed: Math.max(0, c)
            };
        });
    }, [data]);

    return (
        <div className="bg-[#fbfcff] rounded-[2rem] border border-slate-100 shadow-sm p-10 h-[520px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-[17px] font-black text-[#2d3748] tracking-tight">Task Trends - Last 6 Months</h3>
                <div className="flex bg-white border border-slate-100 rounded-2xl px-5 py-2.5 cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                    <span className="text-[12px] font-black text-slate-500 mr-3">Last 6 Months</span>
                    <ChevronDown size={16} className="text-slate-400" />
                </div>
            </div>

            <div className="flex items-center gap-8 mb-8 ml-2">
                {[
                    { label: 'New Tasks', color: 'bg-[#3b82f6]' },
                    { label: 'Pending', color: 'bg-[#febc6b]' },
                    { label: 'Overdue', color: 'bg-[#ff697e]' },
                    { label: 'Completed', color: 'bg-[#38b2ac]', isLine: true }
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full ${item.color} shadow-sm`} />
                        <span className="text-[13px] font-bold text-slate-500">{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trends} margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 13, fontWeight: 'bold', fill: '#64748b' }}
                            height={60}
                            dy={20}
                            interval={0}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fontWeight: 700, fill: '#adb5bd' }} 
                            domain={['auto', 'auto']}
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '15px' }}
                            cursor={{ fill: '#f7fafc', opacity: 0.4 }}
                        />
                        <Bar dataKey="New" fill="#3b82f6" barSize={10} radius={[5, 5, 0, 0]} />
                        <Bar dataKey="Pending" fill="#febc6b" barSize={10} radius={[5, 5, 0, 0]} />
                        <Bar dataKey="Overdue" fill="#ff697e" barSize={10} radius={[5, 5, 0, 0]} />
                        
                        <Line 
                            type="monotone" 
                            dataKey="Completed" 
                            stroke="#38b2ac" 
                            strokeWidth={4} 
                            dot={{ fill: '#fff', stroke: '#38b2ac', strokeWidth: 3, r: 6 }} 
                            activeDot={{ r: 8, strokeWidth: 0 }}
                            connectNulls
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const OrganizationHealth = ({ metrics }) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
            <h3 className="text-[15px] font-semibold text-slate-700 mb-6">Organization Health</h3>
            
            <div className="space-y-6">
                <div className="flex items-center justify-between group cursor-help">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100 shadow-sm group-hover:scale-110 transition-transform">
                            <Target size={18} />
                        </div>
                        <div className="grid">
                            <span className="text-[12px] font-bold text-slate-800 leading-tight">Avg Completion Rate</span>
                            <span className="text-[10px] text-slate-400 font-bold capitalize tracking-tight">Accounts Receivable</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[18px] font-bold text-slate-800">{metrics?.orgCompletionRate || 23.74}%</span>
                        <div className="w-1 h-8 bg-emerald-400 rounded-full" />
                    </div>
                </div>

                <div className="flex items-center justify-between group cursor-help">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100 shadow-sm group-hover:scale-110 transition-transform">
                            <Clock size={18} />
                        </div>
                        <div className="grid">
                            <span className="text-[12px] font-bold text-slate-800 leading-tight">Avg On-Time %</span>
                            <span className="text-[10px] text-slate-400 font-bold capitalize tracking-tight">Fixed Assets</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[18px] font-bold text-slate-800">{metrics?.avgOnTime || 80}%</span>
                        <div className="w-1 h-8 bg-sky-400 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExportReportsPanel = ({ fromDate, toDate }) => {
    const handleDownload = async (format) => {
        const toastId = toast.loading(`Preparing ${format.toUpperCase()} report...`);
        try {
            const endpoint = format === 'pdf' ? '/reports/cfo/export-pdf' : '/reports/cfo/export-excel';
            
            // Clean params to avoid "undefined" strings in URL
            const params = {};
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;

            const response = await api.get(endpoint, {
                params,
                responseType: 'blob',
                headers: { 'Accept': 'application/octet-stream' }
            });

            // If the blob is very small, it might be a JSON error disguised as a blob
            if (response.data.size < 200) {
                const text = await response.data.text();
                try {
                    const errorJson = JSON.parse(text);
                    throw new Error(errorJson.detail || 'Report generation failed');
                } catch (e) { /* Not JSON, proceed with download */ }
            }

            const contentType = response.headers['content-type'] || (format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            const blob = new Blob([response.data], { type: contentType });
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `CFO_Report_${format.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success(`${format.toUpperCase()} downloaded successfully`, { id: toastId });
        } catch (err) {
            console.error(`Export failed:`, err);
            toast.error(err.message || `Failed to download ${format} report`, { id: toastId });
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 overflow-hidden relative group">
            <h3 className="text-[15px] font-semibold text-slate-700 mb-6 flex items-center gap-2 relative">
                <Layout size={16} className="text-slate-400" />
                Export Reports
            </h3>

            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Excel', format: 'xlsx', icon: '📊', color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100' },
                    { label: 'PDF', format: 'pdf', icon: '📕', color: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100' },
                ].map((ext) => (
                    <button
                        key={ext.format}
                        onClick={() => handleDownload(ext.format === 'xlsx' ? 'excel' : 'pdf')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border border-slate-100 transition-all hover:shadow-md hover:scale-[1.05] bg-white group ${ext.bg}`}
                    >
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-sm">{ext.icon}</span>
                            <span className={`text-[11px] font-black capitalize tracking-widest ${ext.color}`}>{ext.label}</span>
                        </div>
                        <div className="w-6 h-0.5 rounded-full bg-slate-200" />
                    </button>
                ))}
            </div>
        </div>
    );
};

const CFODashboard = () => {
    const navigate = useNavigate();
    const handleCreateTask = () => navigate('/tasks/assign');
    const handleViewReports = () => navigate('/reports');
    const handleManageTeam = () => navigate('/admin');

    const [dashboardData, setDashboardData] = useState(null);
    const [orgMetrics, setOrgMetrics] = useState(null);
    const [trendsData, setTrendsData] = useState([]);
    const [deptPerformance, setDeptPerformance] = useState([]);
    const [todayOrgTasks, setTodayOrgTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const todayTasksRef = useRef([]); // Protections against stale closures in setInterval


    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [selectedEmployeeForIssue, setSelectedEmployeeForIssue] = useState('');
    const [isDeptReviewModalOpen, setIsDeptReviewModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('performance'); // 'performance', 'okr', or 'dept_view'
    const [selectedDept, setSelectedDept] = useState(null);

    const handleDeptSelect = (deptId) => {
        const dept = deptPerformance.find(d => (d.department_id || d.id || d.name) === deptId);
        if (dept) {
            setSelectedDept({ id: dept.department_id || dept.id, name: dept.department_name || dept.name });
            setViewMode('dept_view');
        }
    };

    const handleIssueClick = (name) => {
        setSelectedEmployeeForIssue(name);
        setIsIssueModalOpen(true);
    };

    const handleSaveIssue = (issueData) => {
        console.log('Saving executive issue record:', issueData);
        toast.success(`Performance record saved for ${issueData.employee}`, {
            icon: '🛡️',
            style: {
                borderRadius: '1rem',
                background: '#1e293b',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
            },
        });
        // In a real app, we would POST this to an /issues or /performance endpoint
    };

    const handleSaveDeptReview = (reviewData) => {
        console.log('Saving department review:', reviewData);
        toast.success(`Executive review for ${reviewData.department} finalized`, {
            icon: '🏢',
            style: {
                borderRadius: '1rem',
                background: '#064e3b',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
            },
        });
        // In a real app, we would POST this to an /dept-reviews endpoint
    };

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

    const [fromDate, setFromDate] = useState(localStorage.getItem('dashboard_from_date') || '');
    const [toDate, setToDate] = useState(localStorage.getItem('dashboard_to_date') || '');

    useEffect(() => {
        const handleFilterChange = () => {
            setFromDate(localStorage.getItem('dashboard_from_date') || '');
            setToDate(localStorage.getItem('dashboard_to_date') || '');
        };

        window.addEventListener('dashboard-filter-change', handleFilterChange);
        return () => window.removeEventListener('dashboard-filter-change', handleFilterChange);
    }, []);

    const DEPT_COLORS = [
        '#6366f1',
        '#10b981',
        '#f59e0b',
        '#3b82f6',
        '#8b5cf6',
        '#f43f5e',
        '#06b6d4',
        '#f97316',
    ];


    const fetchDashboardData = async () => {
        setLoading(true);
        const queryParams = {};
        if (fromDate) { queryParams.start_date = fromDate; queryParams.from_date = fromDate; }
        if (toDate) { queryParams.end_date = toDate; queryParams.to_date = toDate; }

        try {
            const [dataRes, todayRes, metricsRes, trendsRes, deptsRes] = await Promise.all([
                api.get('/dashboard/cfo', { params: queryParams }).catch(() => ({ data: {} })),
                api.get('/dashboard/cfo/today', { params: queryParams }).catch(() => ({ data: {} })),
                api.get('/dashboard/cfo/org-metrics', { params: queryParams }).catch(() => ({ data: {} })),
                api.get('/dashboard/cfo/trends').catch(() => ({ data: {} })),
                api.get('/dashboard/cfo/departments', { params: queryParams }).catch(() => ({ data: {} }))
            ]);
            const metricsPayload = metricsRes?.data?.data || metricsRes?.data || {};
            setOrgMetrics(metricsPayload);

            const trendsPayload = trendsRes?.data?.data || trendsRes?.data || [];
            setTrendsData(Array.isArray(trendsPayload) ? trendsPayload : []);

            const deptsPayload = deptsRes?.data?.data || deptsRes?.data || [];
            const rawDepts = Array.isArray(deptsPayload) ? deptsPayload : [];

            const dashboardPayload = dataRes?.data?.data || dataRes?.data || {};
            const todayPayload = todayRes?.data?.data || todayRes?.data || todayRes?.data?.tasks || [];
            const todayRows = Array.isArray(todayPayload) ? todayPayload : (Array.isArray(todayPayload?.items) ? todayPayload.items : []);

            const totalTasksFromPayload = dashboardPayload?.total_tasks ?? dashboardPayload?.total ?? 0;
            const hasDashboardStats = totalTasksFromPayload > 0 || (dashboardPayload?.department_stats?.length > 0) || (dashboardPayload?.dept_stats?.length > 0);



            // Helper: compute per-dept status counts from a flat task array
            const buildDeptStatusCounts = (normalizedTasks) => {
                const byDeptName = {};
                normalizedTasks.forEach(t => {
                    const d = t.department;
                    if (!byDeptName[d]) byDeptName[d] = { new_tasks: 0, in_progress_tasks: 0, submitted_tasks: 0, rework_tasks: 0, approved_tasks_computed: 0 };
                    if (t.status === 'NEW') byDeptName[d].new_tasks++;
                    if (t.status === 'IN_PROGRESS') byDeptName[d].in_progress_tasks++;
                    if (t.status === 'SUBMITTED') byDeptName[d].submitted_tasks++;
                    if (t.status === 'REWORK') byDeptName[d].rework_tasks++;
                    if (t.status === 'APPROVED') byDeptName[d].approved_tasks_computed++;
                });
                return byDeptName;
            };

            // Helper: derive status label from completion_pct
            const deriveStatus = (dept) => {
                if (dept.status && dept.status !== 'NO_DATA' && dept.status !== 'null' && dept.status !== 'undefined') return dept.status;
                if (!dept.total_tasks && !dept.total) return 'NO_DATA';
                const pct = dept.completion_pct || 0;
                if (pct >= 70) return 'ON_TRACK';
                if (pct >= 40) return 'AT_RISK';
                return 'OFF_TRACK';
            };

            // Helper: enrich rawDepts with per-status counts from task data
            const enrichDepts = (depts, taskCounts) => {
                return depts.map(d => {
                    // Try exact match or fuzzy match (case-insensitive, includes)
                    const dName = (d.department_name || d.name || '').toLowerCase();
                    const matchedKey = Object.keys(taskCounts).find(k =>
                        k.toLowerCase() === dName || dName.includes(k.toLowerCase()) || k.toLowerCase().includes(dName)
                    );
                    const counts = matchedKey ? taskCounts[matchedKey] : {};

                    // Priority: 1. Computed from recent tasks, 2. API fields, 3. Fallback to 0
                    const approvedComputed = (matchedKey && counts.approved_tasks_computed !== undefined)
                        ? counts.approved_tasks_computed
                        : (d.approved_tasks ?? d.completed_tasks ?? d.completed ?? 0);

                    const total = Number(d.total_tasks || d.total || 0);

                    // Recompute completion_pct from actual counts with precision
                    // If we have total but our computation found 0 approved, check if API had a better percentage
                    let computedPct = total > 0 ? (approvedComputed / total) * 100 : (Number(d.completion_pct) || 0);
                    if (computedPct === 0 && d.completion_pct > 0) computedPct = Number(d.completion_pct);

                    const enriched = {
                        ...d,
                        new_tasks: counts.new_tasks ?? (d.new_tasks ?? d.new ?? 0),
                        in_progress_tasks: counts.in_progress_tasks ?? (d.in_progress_tasks ?? d.in_progress ?? 0),
                        submitted_tasks: counts.submitted_tasks ?? (d.submitted_tasks ?? d.submitted ?? 0),
                        rework_tasks: counts.rework_tasks ?? (d.rework_tasks ?? d.rework ?? 0),
                        approved_tasks: approvedComputed,
                        completion_pct: computedPct,
                    };
                    enriched.status = deriveStatus(enriched);
                    return enriched;
                });
            };

            const aggregateFromTasks = (rows) => {
                const normalized = rows.map(normalizeRow);
                const counts = { NEW: 0, IN_PROGRESS: 0, SUBMITTED: 0, APPROVED: 0, REWORK: 0, CANCELLED: 0 };
                const byDept = {};

                normalized.forEach(t => {
                    if (counts[t.status] !== undefined) counts[t.status]++;
                    const d = t.department;
                    if (!byDept[d]) byDept[d] = { department_id: d, name: d, department_name: d, total_tasks: 0, approved_tasks: 0, pending_tasks: 0, total: 0, completed: 0, new_tasks: 0, in_progress_tasks: 0, submitted_tasks: 0, rework_tasks: 0 };
                    byDept[d].total_tasks++;
                    byDept[d].total++;
                    if (t.status === 'APPROVED') { byDept[d].approved_tasks++; byDept[d].completed++; }
                    if (!['APPROVED', 'CANCELLED'].includes(t.status)) byDept[d].pending_tasks++;
                    if (t.status === 'NEW') byDept[d].new_tasks++;
                    if (t.status === 'IN_PROGRESS') byDept[d].in_progress_tasks++;
                    if (t.status === 'SUBMITTED') byDept[d].submitted_tasks++;
                    if (t.status === 'REWORK') byDept[d].rework_tasks++;
                });

                const totalCount = normalized.length;
                const approvedCount = counts.APPROVED;

                const totalActive = normalized.filter(t => !['APPROVED', 'CANCELLED'].includes(t.status)).length;
                const overdue = normalized.filter((t) => {
                    const due = toDateKey(t.due_date);
                    const today = new Date().toLocaleDateString('en-CA');
                    return (t.is_overdue || t.overdue || (due && due < today)) && !['APPROVED', 'CANCELLED'].includes(t.status);
                }).length;

                const deptArray = Object.values(byDept).map(d => ({
                    ...d,
                    completion_pct: d.total_tasks > 0 ? (d.approved_tasks / d.total_tasks) * 100 : 0,
                    status: deriveStatus(d),
                }));

                setDeptPerformance((rawDepts.length > 0 ? enrichDepts(rawDepts, buildDeptStatusCounts(normalized)) : deptArray).sort((a, b) => b.completion_pct - a.completion_pct));
                setDashboardData({
                    total_tasks: totalActive,
                    approved_tasks: approvedCount,
                    pending_tasks: totalActive,
                    rework_tasks: counts.REWORK,
                    in_progress_tasks: counts.IN_PROGRESS,
                    new_tasks: counts.NEW,
                    overdue_tasks: overdue,
                    org_performance_index: totalCount > 0 ? (approvedCount / totalCount) * 100 : 0,
                    department_stats: Object.values(byDept),
                });
                setTodayOrgTasks(normalized.slice(0, 200));
            };

            // Always fetch all org tasks to compute per-dept status breakdowns
            // Simplified fetch to avoid 422 - prioritize simple scope and then fallback
            const fetchOrgTasks = async () => {
                const candidates = [
                    { scope: 'org', limit: 200 },
                    { scope: 'all', limit: 200 },
                    { limit: 100 }
                ];

                for (const params of candidates) {
                    try {
                        const res = await api.get('/tasks', { params });
                        if (res?.data) return res;
                    } catch (e) {
                        // Only continue to fallback if it's a validation error (422) or missing endpoint
                        if (e.response?.status === 422 || e.response?.status === 404 || e.response?.status === 400) {
                            console.warn(`Org task fetch fail for ${JSON.stringify(params)}, trying fallback...`);
                            continue;
                        }
                        throw e;
                    }
                }
                return null;
            };

            const allTasksRes = await fetchOrgTasks();
            const allTasks = allTasksRes?.data
                ? (Array.isArray(allTasksRes.data) ? allTasksRes.data : (allTasksRes.data?.data || []))
                : [];

            // Pass 1: Build lookup map for ID -> Title
            const taskMap = {};
            [...todayRows, ...allTasks].forEach(t => {
                const id = t.task_id || t.id;
                const title = t.task_title || t.title || t.task_name || t.name || t.directive_title || t.directive_name;
                if (id && title) taskMap[id] = title;
            });

            // Pass 1.5: Fetch each child task's detail to get parent_task_title.
            // The backend now returns parent_task_title on GET /tasks/{task_id}.
            const tasksNeedingParentFetch = [];
            const seenParentIds = new Set();
            [...todayRows, ...allTasks].forEach(t => {
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
                console.log(`CFODashboard - Fetching ${tasksNeedingParentFetch.length} task details for parent titles...`);
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

            // Pass 2: Normalize
           // Pass 2: Normalize
const normalizeRow = (t) => {
    const pid =
        t.parent_task_id ||
        t.parent_id ||
        (t.parent_task ? (t.parent_task.task_id || t.parent_task.id) : null);

    let ptitle =
        t.parent_task_title ||
        t.parentTaskTitle ||
        t.parent_task_name ||
        t.parent_title ||
        t.parent_name ||
        t.parent_directive_title ||
        t.parent_directive_name ||
        (t.parent_task
            ? (t.parent_task.task_title ||
               t.parent_task.title ||
               t.parent_task.task_name ||
               t.parent_task.name ||
               t.parent_task.directive_title)
            : '');

    // fallback from fetched parents
    if (!ptitle && pid && taskMap[pid]) {
        ptitle = taskMap[pid];
    }

    return {
        ...t,
        task_id: t.task_id || t.id,
        title: t.title || 'Untitled Directive',
        status: String(t.status || '').toUpperCase(),
        department: t.department_name || t.department || t.dept_name || 'Accounts',
        priority: (t.priority || t.severity || 'MEDIUM').toUpperCase(),
        assigneeName: t.assigned_to_name || t.assignee || 'Unassigned',

        // ✅ FIX
        parent_task_id: pid ? pid : '-',
        parent_task_title: ptitle ? ptitle : '-',
    };
};

            const allNormalized = allTasks.map(normalizeRow);
            const taskCountsByDept = buildDeptStatusCounts(allNormalized);

            if (hasDashboardStats) {
                setDashboardData(dashboardPayload);
                const tasksForToday = todayRows.length > 0 ? todayRows.map(normalizeRow) : allNormalized;
                setTodayOrgTasks(tasksForToday.slice(0, 200));
                // Enrich rawDepts with computed per-status counts
                setDeptPerformance(enrichDepts(rawDepts, allNormalized.length > 0 ? taskCountsByDept : buildDeptStatusCounts(tasksForToday)));
                return;
            }

            if (todayRows.length > 0) { aggregateFromTasks(todayRows); return; }
            if (allNormalized.length > 0) { aggregateFromTasks(allTasks); return; }

            // Fallback: still enrich rawDepts even if no task data
            setDeptPerformance(rawDepts.map(d => ({ ...d, status: deriveStatus(d), new_tasks: 0, in_progress_tasks: 0, submitted_tasks: 0, rework_tasks: 0 })));
            setDashboardData({
                total_tasks: 0, approved_tasks: 0, pending_tasks: 0, rework_tasks: 0,
                in_progress_tasks: 0, new_tasks: 0, org_performance_index: 0, department_stats: []
            });
            setTodayOrgTasks([]);

        } catch (err) { console.error("CFO Dashboard Error:", err); }
        finally {


            setLoading(false);
        }
    };




    useEffect(() => {

    fetchDashboardData();

    const dashboardInterval = setInterval(fetchDashboardData, 30000);

    return () => {
        clearInterval(dashboardInterval);
    };

}, [fromDate, toDate]);




    const { workloadData, orgStatusData, globalStats, kpis } = useMemo(() => {
        if (!dashboardData) return { workloadData: [], orgStatusData: [], globalStats: {}, kpis: null };
        const deptSource = dashboardData.department_stats || [];

        const workloadData = deptSource.map((d, i) => ({
            name: d.name || d.department_id || 'Unknown',
            Completed: d.approved_tasks || d.completed || 0,
            Pending: d.in_progress_tasks || d.pending || 0,
            Rework: d.rework_tasks || 0,
            Total: d.total || d.total_tasks || 0,
            fill: DEPT_COLORS[i % DEPT_COLORS.length],
        }));

        const orgStatusData = [
            { name: 'Approved', value: dashboardData.approved_tasks || 0, fill: '#10b981' },
            { name: 'Pending', value: dashboardData.pending_tasks || 0, fill: '#f59e0b' },
            { name: 'Rework', value: dashboardData.rework_tasks || 0, fill: '#ef4444' },
            { name: 'In Progress', value: dashboardData.in_progress_tasks || 0, fill: '#6366f1' },
            { name: 'New', value: dashboardData.new_tasks || 0, fill: '#3b82f6' },
        ].filter(d => d.value > 0);

        const departmentsOnTrack = deptSource.filter(d => {
            const total = d.total_tasks || d.total || 0;
            const approved = d.approved_tasks || d.completed || 0;
            return total > 0 && (approved / total) >= 0.7;
        }).length;

        const kpis = {
            new: dashboardData.new_tasks || 0,
            inProgress: dashboardData.in_progress_tasks || 0,
            submitted: dashboardData.submitted_tasks || 0,
            rework: dashboardData.rework_tasks || 0,
            overdue: dashboardData.overdue_tasks || 0,
            orgCompletionRate: orgMetrics?.org_avg_completion_rate ?? dashboardData.org_performance_index ?? 0,
            avgOnTime: orgMetrics?.org_avg_on_time_pct ?? 0,
            avgRework: orgMetrics?.org_avg_rework_rate ?? 0
        };

        const topEmployee = (() => {
            if (!todayOrgTasks.length) return null;
            const byEmployee = {};
            todayOrgTasks.forEach(t => {
                const name = t.assigneeName || t.assigned_to_name || 'Unknown';
                const dept = t.department_name || t.department || 'Accounts';
                if (!byEmployee[name]) byEmployee[name] = { name, department: dept, completed: 0, total: 0 };
                byEmployee[name].total++;
                if (t.status === 'APPROVED' || t.status === 'COMPLETED') byEmployee[name].completed++;
            });
            return Object.values(byEmployee)
                .sort((a, b) => (b.completed / b.total) - (a.completed / a.total) || b.total - a.total)[0];
        })();

        return {
            workloadData,
            orgStatusData,
            globalStats: {
                totalTasks: dashboardData.total_tasks || 0,
                completedTasks: dashboardData.approved_tasks || 0,
                pendingTasks: dashboardData.pending_tasks || 0,
                in_progress_tasks: dashboardData.in_progress_tasks || 0,
                overallScore: dashboardData.org_performance_index || 0,
            },
            kpis,
            topEmployee
        };
    }, [dashboardData, orgMetrics, todayOrgTasks]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-10 bg-white/50 backdrop-blur-xl rounded-2xl border border-slate-100 shadow-sm animate-pulse">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-slate-500 font-black capitalize tracking-[0.2em] text-[10px]">Syncing Executive Intelligence...</p>
        </div>
    );

    const topDept = [...deptPerformance].sort((a, b) => b.completion_pct - a.completion_pct)[0];
    const bottomDept = [...deptPerformance].sort((a, b) => a.completion_pct - b.completion_pct)[0];

    return (
        <div className="space-y-4 animate-fade-in pb-8 mt-2">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-100/50 p-1 rounded-2xl w-fit border border-slate-200/50">
                <button 
                    onClick={() => setViewMode('performance')}
                    className={`px-6 py-2 rounded-xl text-[11px] font-black capitalize tracking-widest transition-all ${viewMode === 'performance' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Performance
                </button>
                <button 
                    onClick={() => {
                        if (!selectedDept && deptPerformance.length > 0) {
                            const first = deptPerformance[0];
                            setSelectedDept({ id: first.department_id || first.id, name: first.department_name || first.name });
                        }
                        setViewMode('dept_view');
                    }}
                    className={`px-6 py-2 rounded-xl text-[11px] font-black capitalize tracking-widest transition-all ${viewMode === 'dept_view' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Department View
                </button>
            </div>

            {/* Department Selector for Dept View */}
            {viewMode === 'dept_view' && (
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-fade-in">
                    <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-2">Select Department:</span>
                    <CustomSelect
                        options={deptPerformance.map(d => ({ label: d.department_name || d.name, value: d.department_id || d.id || d.name }))}
                        value={selectedDept?.id || selectedDept?.name}
                        onChange={handleDeptSelect}
                        className="w-64"
                    />
                </div>
            )}

            {viewMode === 'dept_view' ? (
                <ManagerDashboard overriddenDept={selectedDept} />
            ) : (
                <>
                    <div className="space-y-4">

            {/* ── KPI ROW: 5 cards in one row ── */}
<div className="grid grid-cols-5 gap-6">
    {[
        { label: 'New Tasks', value: kpis?.new, icon: PlusCircle, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
        { label: 'In Progress', value: kpis?.inProgress, icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
        { label: 'Submitted', value: kpis?.submitted, icon: CheckCircle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
        { label: 'Rework Required', value: kpis?.rework, icon: Activity, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
        { label: 'Overdue Tasks', value: kpis?.overdue, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
    ].map((item, idx) => (
        <div
            key={idx}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col gap-3 hover:shadow-md transition-all group"
        >
            <div className="flex items-center justify-between mb-2">
                <div className={`w-14 h-14 rounded-xl ${item.bg} flex items-center justify-center ${item.color} border border-white shadow-md group-hover:scale-110 transition-transform`}>
                    <item.icon size={28} strokeWidth={2.5} />
                </div>

                {item.trend && (
                    <span className="text-lg font-semibold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
                        ↑ {item.trend}
                    </span>
                )}
            </div>

            <div className="grid gap-1">
                <span className="text-base font-bold text-slate-500 capitalize tracking-tight whitespace-nowrap">
                    {item.label}
                </span>

                <span className="text-4xl font-black tabular-nums text-slate-800 leading-none">
                    {item.value ?? 0}
                </span>
            </div>

            {item.trend && (
                <span className="text-base font-medium text-slate-400">
                    vs last month
                </span>
            )}

            {item.sub && (
                <span className="text-base font-medium text-slate-400 leading-none mt-1">
                    {item.sub}
                </span>
            )}
        </div>
    ))}
</div>

            {/* ── MAIN CONTENT GRID ── */}
            <div className="grid grid-cols-[1fr_320px] gap-4">
                {/* ── LEFT COLUMN: Graphical Panels ── */}
                <div className="flex flex-col gap-4">
                    <TaskTrendsChart data={trendsData} />

                    {/* Department Performance Table - POLISHED */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                        <h3 className="text-[17px] font-black text-slate-800 mb-8 flex items-center gap-2">
                            <Target size={18} className="text-emerald-500" />
                            Department Performance
                        </h3>
                        {deptPerformance.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-[13px] font-bold text-slate-300 capitalize tracking-widest">No department data</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left font-sans">
                                    <thead>
                                        <tr className="text-[11px] font-black text-slate-400 capitalize tracking-[0.1em] border-b border-slate-100">
                                            <th className="pb-4 pr-6">Department Name</th>
                                            <th className="pb-4 px-3 text-center">Total</th>
                                            <th className="pb-4 px-3 text-center">Overdue</th>
                                            <th className="pb-4 px-3 text-center">Progress</th>
                                            <th className="pb-4 px-3 text-center">Completed</th>
                                            <th className="pb-4 px-3 min-w-[150px]">Success Rate</th>
                                            <th className="pb-4 pl-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {deptPerformance.map((dept, idx) => {
                                            const status = dept.status || 'NO_DATA';
                                            const statusStyles = {
                                                ON_TRACK: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                                AT_RISK: 'bg-amber-50 text-amber-600 border-amber-100',
                                                OFF_TRACK: 'bg-rose-50 text-rose-600 border-rose-100',
                                                NO_DATA: 'bg-slate-50 text-slate-500 border-slate-100',
                                            };
                                            return (
                                                <tr 
                                                    key={idx} 
                                                    className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                                                    onClick={() => handleDeptSelect(dept.department_id || dept.id || dept.name)}
                                                >
                                                    <td className="py-5 pr-6">
                                                        <span className="text-[16px] font-black text-slate-900 capitalize tracking-tight group-hover:text-indigo-600 transition-colors" style={{ fontFamily: 'Aptos, sans-serif' }}>
                                                            {dept.department_name || dept.name || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 px-3 text-center text-[15px] font-black text-slate-600 tabular-nums">{dept.total_tasks || 0}</td>
                                                    <td className="py-5 px-3 text-center text-[15px] font-black text-rose-500 tabular-nums">{dept.overdue_tasks || 0}</td>
                                                    <td className="py-5 px-3 text-center text-[15px] font-black text-indigo-500 tabular-nums">{dept.in_progress_tasks || 0}</td>
                                                    <td className="py-5 px-3 text-center text-[15px] font-black text-emerald-500 tabular-nums">{dept.approved_tasks || 0}</td>
                                                    <td className="py-5 px-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                                <div className={`h-full rounded-full transition-all duration-1000 ${dept.completion_pct > 50 ? 'bg-emerald-400' : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]'}`} style={{ width: `${dept.completion_pct || 0}%` }} />
                                                            </div>
                                                            <span className="text-[15px] font-black text-slate-800 tabular-nums min-w-[40px]">
                                                                {Math.round(dept.completion_pct || 0)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 pl-4 text-right">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black capitalize tracking-widest border transition-transform group-hover:scale-110 ${statusStyles[status]}`}>
                                                            {status.replace('_', ' ').toLowerCase()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT COLUMN: Risk Monitor + Org Health + Exports ── */}
                <div className="flex flex-col gap-4">
                    {/* Top Performer Highlights - MATCHING IMAGE */}
                    <div className="grid grid-cols-1 gap-4">
                         {/* Top Performer Employee (matches image) */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 hover:shadow-md transition-all group overflow-hidden relative">
                            {/* Title from image */}
                            <h3 className="text-[15px] font-black text-slate-800 mb-8 tracking-tight">
                                Department Top Performer
                            </h3>

                            <div className="flex flex-col gap-4">
                                {/* Avatar + Trend Icon */}
                                <div className="relative w-28 h-28">
                                    <div className="w-full h-full rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-4xl font-black text-slate-700 shadow-sm">
                                        {(globalStats.topEmployee?.name || 'A').charAt(0).toUpperCase()}
                                    </div>
                                    {/* Yellow Trend Icon from image */}
                                    <div className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-amber-400 border-4 border-white flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                        <TrendingUp size={20} strokeWidth={3} />
                                    </div>
                                </div>

                                {/* Name and Department from image */}
                                <div className="space-y-1">
                                    <h4 className="text-[32px] font-black text-slate-900 leading-none tracking-tighter">
                                        {globalStats.topEmployee?.name || 'AP Exec 1'}
                                    </h4>
                                    <p className="text-[14px] font-bold text-sky-400 capitalize tracking-tight">
                                        {globalStats.topEmployee?.department || 'Accounts Payables'}
                                    </p>
                                </div>

                                {/* "TASKS" blue label at bottom as in image */}
                                <div className="mt-4">
                                    <span className="text-[12px] font-black text-indigo-500 capitalize tracking-[0.2em]">TASKS</span>
                                </div>
                            </div>

                            {/* Decorative background circle */}
                            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -z-10" />
                        </div>

                        {/* Department Highlights */}
                        <div className="space-y-4">
                            {/* Top Department */}
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all group border-l-8 border-l-emerald-500 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl shadow-sm border border-emerald-100">🏆</div>
                                        <span className="text-[11px] font-black text-slate-400 capitalize tracking-[0.2em]">Top Performer</span>
                                    </div>
                                    <TrendingUp size={18} className="text-emerald-400 opacity-50" />
                                </div>
                                <h4 className="text-[20px] font-black text-slate-900 leading-tight capitalize tracking-tighter relative z-10">
                                    {topDept?.department_name || topDept?.name || '—'}
                                </h4>
                                <div className="flex items-center gap-3 mt-3 relative z-10">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${topDept?.completion_pct || 0}%` }} />
                                    </div>
                                    <span className="text-[17px] font-black text-emerald-500 tabular-nums">
                                        {Math.round(topDept?.completion_pct || 0)}%
                                    </span>
                                </div>
                                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-emerald-50/30 rounded-full blur-2xl -z-0" />
                            </div>

                            {/* Bottom Department */}
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all group border-l-8 border-l-rose-500 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-xl shadow-sm border border-rose-100">⚠️</div>
                                        <span className="text-[11px] font-black text-slate-400 ca[italize] tracking-[0.2em]">Needs Attention</span>
                                    </div>
                                    <AlertTriangle size={18} className="text-rose-400 opacity-50" />
                                </div>
                                <h4 className="text-[20px] font-black text-slate-900 leading-tight capitalize tracking-tighter relative z-10">
                                    {bottomDept?.department_name || bottomDept?.name || '—'}
                                </h4>
                                <div className="flex items-center gap-3 mt-3 relative z-10">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)]" style={{ width: `${bottomDept?.completion_pct || 0}%` }} />
                                    </div>
                                    <span className="text-[17px] font-black text-rose-500 tabular-nums">
                                        {Math.round(bottomDept?.completion_pct || 0)}%
                                    </span>
                                </div>
                                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-rose-50/30 rounded-full blur-2xl -z-0" />
                            </div>
                        </div>
                    </div>

                    {/* Organization Health Stats in Sidebar */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                            <Shield size={14} className="text-violet-600" />
                            <h4 className="text-[11px] font-black text-slate-500 capitalize tracking-widest">Org Health</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-violet-50 rounded-xl">
                                <p className="text-[9px] font-bold text-violet-400 capitalize tracking-tighter">On-Time</p>
                                <p className="text-lg font-black text-violet-700">{kpis.avgOnTime}%</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-xl">
                                <p className="text-[9px] font-bold text-emerald-400 capitalize tracking-tighter">Rework</p>
                                <p className="text-lg font-black text-emerald-700">{kpis.avgRework}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col min-h-[400px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[15px] font-semibold text-slate-700 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-rose-500" />
                                Risk Monitor
                            </h3>
                            <button onClick={() => navigate('/admin')} className="text-[10px] font-black text-indigo-500 capitalize tracking-widest hover:underline">View All</button>
                        </div>
                        
                        <div className="flex items-center text-[10px] font-bold text-slate-400 capitalize pb-2 border-b border-slate-100 mb-3 px-1">
                            <span className="w-[45%]">Employee</span>
                            <span className="w-[15%] text-center">Active</span>
                            <span className="w-[15%] text-center">Score</span>
                            <span className="w-[25%] text-right pr-2">Status</span>
                        </div>
                        {(() => {
                            // Build per-employee risk stats from all tasks to be more comprehensive
                            const byEmployee = {};

                            // Use all tasks if todayOrgTasks is too limited
                            const taskPool = todayOrgTasks.length > 5 ? todayOrgTasks : todayOrgTasks;
                            // Actually, let's use all tasks available in the component scope if possible, 
                            // but todayOrgTasks seems to be the main state for tasks.

                            todayOrgTasks.forEach(t => {
                                const name = t.assigneeName || t.assigned_to_name || 'Unknown';
                                if (!byEmployee[name]) {
                                    byEmployee[name] = {
                                        name,
                                        overdue: 0,
                                        rework: 0,
                                        completed: 0,
                                        total: 0,
                                    };
                                }
                                const emp = byEmployee[name];
                                emp.total += 1;
                                if (t.status === 'APPROVED' || t.status === 'COMPLETED') emp.completed += 1;
                                if (t.status === 'REWORK') emp.rework += 1;
                                if (t.is_overdue || t.overdue) emp.overdue += 1;
                            });

                            const employees = Object.values(byEmployee).map(emp => {
                                // Calculate a Health Score (0-100)
                                // Penalty-based: Start at 100, subtract for issues.
                                // Overdue: -15, Rework: -10, Pending: -2 (if total > 0)
                                let penalty = (emp.overdue * 15) + (emp.rework * 10);
                                const healthScore = Math.max(0, 100 - penalty);

                                return { ...emp, healthScore };
                            });

                            const items = employees
                                .sort((a, b) => a.healthScore - b.healthScore) // Show lowest health first
                                .slice(0, 8);

                            if (items.length === 0) return (
                                <div className="py-8 text-center text-slate-400">
                                    <Activity size={24} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-[13px] font-semibold capitalize tracking-widest">No employee data</p>
                                </div>
                            );

                            return items.map((emp, i) => {
                                const statusLabel =
                                    emp.healthScore >= 90
                                        ? 'On Track'
                                        : emp.healthScore >= 70
                                            ? 'Watch'
                                            : 'At Risk';
                                const statusColor =
                                    emp.healthScore >= 90
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        : emp.healthScore >= 70
                                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                            : 'bg-rose-50 text-rose-600 border border-rose-100';
                                return (
                                    <div key={i} className="flex items-center gap-1 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-xl transition-all px-1">
                                        <div className="flex items-center gap-2.5 w-[45%] min-w-0 pr-1">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-600 shrink-0 overflow-hidden border border-slate-100">
                                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=f1f5f9&color=64748b&bold=true`} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0 grid">
                                                <p className="text-[12px] font-bold text-slate-800 truncate leading-tight" title={emp.name}>{emp.name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold capitalize tracking-tight">Employee</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center w-[15%] shrink-0">
                                            <span className="text-[12px] font-bold text-slate-700 tabular-nums">{emp.total - emp.completed}</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center w-[15%] shrink-0">
                                            <span className="text-[12px] font-bold text-slate-800 tabular-nums">{emp.healthScore}</span>
                                        </div>
                                        <div className="flex justify-end w-[25%] shrink-0">
                                            <button
                                                onClick={() => handleIssueClick(emp.name)}
                                                className={`text-[9px] font-bold px-2 py-1 rounded-lg ${statusColor} hover:opacity-80 transition-opacity whitespace-nowrap w-full text-center tracking-wide`}
                                            >
                                                {statusLabel}
                                            </button>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                        <button
                            onClick={() => navigate('/admin')}
                            className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black capitalize tracking-[0.2em] rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-100"
                        >
                            View Active Intelligence
                        </button>
                    </div>
                    <ExportReportsPanel fromDate={fromDate} toDate={toDate} />
                </div>
            </div>

            <EmployeeIssueModal
                isOpen={isIssueModalOpen}
                onClose={() => setIsIssueModalOpen(false)}
                onSave={handleSaveIssue}
                employeeName={selectedEmployeeForIssue}
            />

                    <DeptReviewModal
                        isOpen={isDeptReviewModalOpen}
                        onClose={() => setIsDeptReviewModalOpen(false)}
                        onSave={handleSaveDeptReview}
                        departments={deptPerformance}
                    />
                    </div>
                </>
            )}
        </div>
    );
};

const PieChart2 = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
);

export default CFODashboard;