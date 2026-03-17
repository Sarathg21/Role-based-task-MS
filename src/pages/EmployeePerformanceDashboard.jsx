import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CustomSelect from '../components/UI/CustomSelect';
import {
    Users, BarChart2, CheckSquare, AlertTriangle, Clock,
    Activity, TrendingUp, Calendar, ChevronDown, Layout,
    CheckCircle, Shield, Target, Plus, Search, HelpCircle,
    ArrowRight, Loader2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';

const PerformanceDashboard = () => {
    const { user } = useAuth();
    const isCFO = user?.role?.toUpperCase() === 'CFO' || user?.role?.toUpperCase() === 'ADMIN';

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
    const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
    const [toDate, setToDate] = useState(getToday());

    // Data
    const [summary, setSummary] = useState(null);
    const [trends, setTrends] = useState([]);
    const [teamPerformance, setTeamPerformance] = useState([]);
    const [employeeRisk, setEmployeeRisk] = useState([]);
    const [deptMetrics, setDeptMetrics] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchDashData = async () => {
        if (!selectedDept) return; // Wait for dept selection
        setLoading(true);
        const params = {};
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
        params.department_id = selectedDept;

        try {
            const [sumRes, trendRes, perfRes, riskRes, metricRes] = await Promise.all([
                api.get('/dashboard/manager', { params }),
                api.get('/dashboard/manager/trends', { params: { ...params, days: 30 } }),
                api.get('/dashboard/manager/team-performance', { params: { ...params, limit: 10 } }),
                api.get('/dashboard/manager/employee-risk', { params: { ...params, limit: 10 } }),
                api.get('/dashboard/manager/department-metrics', { params })
            ]);

            const trendPayload = trendRes.data?.data || trendRes.data || [];
            const normalizedTrends = Array.isArray(trendPayload) ? trendPayload.map(t => ({
                ...t,
                new: t.new ?? t.new_tasks ?? t.assigned ?? 0,
                pending: t.pending ?? t.pending_approval ?? t.completed ?? 0,
                overdue: t.overdue ?? t.overdue_tasks ?? 0
            })) : [];

            setSummary(sumRes.data?.data || sumRes.data || {});
            setTrends(normalizedTrends);
            setTeamPerformance(perfRes.data?.data || perfRes.data || []);
            setEmployeeRisk(riskRes.data?.data || riskRes.data || []);
            setDeptMetrics(metricRes.data?.data || metricRes.data || {});

        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isCFO) {
            api.get('/departments').then(res => {
                const depts = res.data?.data || res.data || [];
                setDepartments(depts);
                if (depts.length > 0 && !selectedDept) {
                    setSelectedDept(depts[0].department_id || depts[0].id);
                }
            });
        }
    }, [isCFO]);
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
    }, [selectedDept, fromDate, toDate]);

    if (loading && !summary) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-[600px] bg-slate-50/30 rounded-3xl">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-400 font-bold capitalize tracking-widest text-[11px]">Syncing Performance Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-700">
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                     <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 tracking-tighter mb-1 capitalize">
                        <span>Organization</span>
                        <ChevronDown size={10} className="-rotate-90 text-slate-300" strokeWidth={3} />
                        <span className="text-slate-400">Strategy</span>
                        <ChevronDown size={10} className="-rotate-90 text-slate-300" strokeWidth={3} />
                        <span className="text-slate-500">Performance</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-[28px] font-black text-slate-900 tracking-tight leading-tight">
                            Performance Dashboard
                        </h1>
                        {selectedDept && (
                            <div className="flex items-center gap-2 group cursor-default">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-lg font-bold text-slate-400 tracking-tight group-hover:text-indigo-500 transition-colors">
                                    {departments.find(d => (d.department_id || d.id) === selectedDept)?.name || 'Department'}
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-slate-400 font-medium text-[13px] mt-0.5">
                        Cross‑Department Team Performance Monitoring
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {isCFO && (
                        <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-2 shadow-sm hover:border-indigo-100 transition-colors">
                             <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest whitespace-nowrap">Department</span>
                            <div className="min-w-[180px]">
                                <CustomSelect
                                    options={departments.map(d => ({ label: d.name, value: d.department_id || d.id }))}
                                    value={selectedDept}
                                    onChange={setSelectedDept}
                                    placeholder="Select Department"
                                    className="!border-none !shadow-none !bg-transparent !p-0"
                                />
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1 shadow-sm">
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-[12px] font-bold text-slate-600 focus:ring-0 px-3 py-1"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                        <span className="text-slate-300">|</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-[12px] font-bold text-slate-600 focus:ring-0 px-3 py-1"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* ── KPI CARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Team Tasks', value: summary?.team_tasks ?? summary?.total_tasks ?? 0, icon: Users, color: 'bg-indigo-500', shadow: 'shadow-indigo-200' },
                    { label: 'In Progress', value: summary?.in_progress_tasks ?? 0, icon: Activity, color: 'bg-indigo-400', shadow: 'shadow-indigo-100' },
                    { label: 'Pending Approval', value: summary?.pending_approval ?? summary?.submitted_tasks ?? 0, icon: Clock, color: 'bg-amber-400', shadow: 'shadow-amber-100' },
                    { label: 'Overdue', value: summary?.overdue_tasks ?? 0, icon: AlertTriangle, color: 'bg-rose-500', shadow: 'shadow-rose-100' }
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 flex items-center gap-5 hover:shadow-md transition-all group">
                        <div className={`w-14 h-14 ${kpi.color} rounded-2xl flex items-center justify-center text-white ${kpi.shadow} shadow-lg transition-transform group-hover:scale-110`}>
                            <kpi.icon size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                             <p className="text-[14px] font-medium text-slate-500 capitalize tracking-tight leading-none mb-1.5">{kpi.label}</p>
                            <h3 className="text-3xl font-semibold text-slate-800 leading-none tabular-nums">{kpi.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── ROW 2: TRENDS | DEPT METRICS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* TaskActivityTrend */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-[18px] font-bold text-slate-800 tracking-tight">Task Summary</h3>
                             <p className="text-[11px] text-slate-400 font-bold capitalize tracking-widest">Last 30 Days Trend</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span className="text-[11px] font-bold text-slate-500">New Tasks</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <span className="text-[11px] font-bold text-slate-500">Pending Approval</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-[11px] font-bold text-slate-500">Overdue Tasks</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends}>
                                <defs>
                                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 11, fontWeight: 'bold', fill: '#94a3b8'}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 11, fontWeight: 'bold', fill: '#94a3b8'}}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '1.25rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="new" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" name="New Tasks" />
                                <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={3} fillOpacity={0} name="Pending Approval" />
                                <Area type="monotone" dataKey="overdue" stroke="#f43f5e" strokeWidth={3} fillOpacity={0} name="Overdue" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* DepartmentPerformanceWidget */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
                    <div>
                        <h3 className="text-[18px] font-bold text-slate-800 tracking-tight">Department Performance</h3>
                         <p className="text-[11px] text-slate-400 font-bold capitalize tracking-widest">{selectedDept === 'all' ? 'All Units' : 'Selected Unit'} Performance</p>
                    </div>

                    <div className="relative flex justify-center">
                        <div className="w-48 h-48 rounded-full border-[12px] border-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-indigo-50/20" />
                            <span className="text-[42px] font-black text-slate-800 leading-none">{deptMetrics?.completion_pct || 0}%</span>
                             <span className="text-[10px] font-extrabold text-slate-400 capitalize tracking-widest mt-2">Completion</span>
                            
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle 
                                    cx="96" cy="96" r="84" 
                                    fill="transparent" 
                                    stroke="currentColor" 
                                    strokeWidth="12" 
                                    className="text-indigo-500" 
                                    strokeDasharray={2 * Math.PI * 84}
                                    strokeDashoffset={(2 * Math.PI * 84) * (1 - (deptMetrics?.completion_pct || 0) / 100)}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                              <p className="text-[10px] font-extrabold text-slate-400 capitalize tracking-widest mb-1">Total</p>
                             <p className="text-xl font-black text-slate-800">{deptMetrics?.total_tasks || 0}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                              <p className="text-[10px] font-extrabold text-slate-400 capitalize tracking-widest mb-1">Completed</p>
                             <p className="text-xl font-black text-emerald-600">{deptMetrics?.completed_tasks || 0}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                              <p className="text-[10px] font-extrabold text-slate-400 capitalize tracking-widest mb-1">Active</p>
                             <p className="text-xl font-black text-indigo-600">{deptMetrics?.active_tasks || (deptMetrics?.total_tasks - deptMetrics?.completed_tasks) || 0}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                              <p className="text-[10px] font-extrabold text-slate-400 capitalize tracking-widest mb-1">Overdue</p>
                             <p className="text-xl font-black text-rose-500">{deptMetrics?.overdue_tasks || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ROW 3: PERFORMANCE TABLE | EMPLOYEE RISK ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                {/* TeamPerformanceTable */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                         <h3 className="text-[18px] font-bold text-slate-800 tracking-tight">Team Performance</h3>
                          <button className="text-[11px] font-bold text-indigo-600 capitalize tracking-widest hover:underline">View All Tasks</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                             <thead className="bg-slate-50/50 text-[10px] font-extrabold text-slate-400 capitalize tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="py-4 px-8">Employee</th>
                                    <th className="py-4 px-4 text-center">Assigned</th>
                                    <th className="py-4 px-4 text-center">Progress</th>
                                    <th className="py-4 px-4 text-center">Review</th>
                                    <th className="py-4 px-4 text-center">Overdue</th>
                                    <th className="py-4 px-8 text-right">Completion Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {teamPerformance.map((emp, i) => (
                                    <tr key={i} className="group hover:bg-slate-50/70 transition-colors">
                                        <td className="py-4 px-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                    {(emp.name || 'U').charAt(0)}
                                                </div>
                                                <span className="text-[14px] font-bold text-slate-700">{emp.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-600">{emp.tasks_assigned || 0}</td>
                                        <td className="py-4 px-4 text-center font-bold text-indigo-500">{emp.in_progress || 0}</td>
                                        <td className="py-4 px-4 text-center font-bold text-amber-500">{emp.pending_review || 0}</td>
                                        <td className="py-4 px-4 text-center font-bold text-rose-500">{emp.overdue || 0}</td>
                                        <td className="py-4 px-8">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="flex-1 max-w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${emp.completion_rate || 0}%` }} />
                                                </div>
                                                <span className="text-[13px] font-black text-slate-800">{emp.completion_rate || 0}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* EmployeeRiskOverview */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col">
                    <div className="mb-8">
                         <h3 className="text-[18px] font-bold text-slate-800 tracking-tight">Employee Risk Overview</h3>
                          <p className="text-[11px] text-slate-400 font-bold capitalize tracking-widest">Employees Requiring Attention</p>
                    </div>

                    <div className="space-y-4 flex-1">
                        {employeeRisk.map((emp, i) => {
                            const statusColor = {
                                'ON_TRACK': 'bg-emerald-500',
                                'WATCH': 'bg-amber-400',
                                'AT_RISK': 'bg-orange-500',
                                'OFF_TRACK': 'bg-rose-500'
                            }[emp.risk_status] || 'bg-slate-300';

                            return (
                                <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-[1.5rem] p-4 flex items-center justify-between hover:bg-white hover:shadow-md transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center font-bold text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            {(emp.name || 'U').charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-slate-800 leading-tight">{emp.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{emp.active_tasks || 0} Tasks · {emp.overdue_tasks || 0} Overdue</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-black text-white uppercase tracking-tighter ${statusColor}`}>
                                            {emp.risk_status?.split('_').join(' ') || 'WATCH'}
                                        </div>
                                        <span className="text-[14px] font-black text-slate-700">{emp.performance_score || 0}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                     <button className="mt-8 w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-[12px] capitalize tracking-widest transition-all shadow-lg active:scale-95">
                        Generate Risk Analysis
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PerformanceDashboard;
