import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CustomSelect from '../components/UI/CustomSelect';
import {
    Users, BarChart2, CheckSquare, AlertTriangle, Clock,
    Activity, TrendingUp, Calendar, ChevronDown, Layout,
    CheckCircle, Shield, Target, Plus, Search, HelpCircle,
    ArrowRight, Loader2, Bell, Settings, User
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area
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
    const [fromDate, setFromDate] = useState(localStorage.getItem('dashboard_from_date') || getFirstDayOfMonth());
    const [toDate, setToDate] = useState(localStorage.getItem('dashboard_to_date') || getToday());

    // Data
    const [summary, setSummary] = useState(null);
    const [trends, setTrends] = useState([]);
    const [teamPerformance, setTeamPerformance] = useState([]);
    const [employeeRisk, setEmployeeRisk] = useState([]);
    const [deptMetrics, setDeptMetrics] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchDashData = async () => {
        if (!selectedDept) return;
        setLoading(true);
        const params = {
            from_date: fromDate,
            to_date: toDate,
            department_id: selectedDept
        };

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
                pending: t.pending ?? t.in_progress ?? t.in_progress_tasks ?? t.pending_approval ?? 0,
                overdue: t.overdue ?? t.overdue_tasks ?? 0,
                completed: t.completed ?? t.approved ?? t.approved_tasks ?? 0
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
        } else {
            setSelectedDept(user?.department_id || user?.dept_id || '');
        }
    }, [isCFO, user]);

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
        if (!selectedDept) return '';
        const dept = departments.find(d => String(d.department_id || d.id) === String(selectedDept));
        return dept ? dept.name : (user?.department_name || user?.department || 'My Department');
    }, [selectedDept, departments, user]);

    if (loading && !summary) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-[600px] bg-slate-50/10 rounded-3xl">
                <Loader2 className="w-12 h-12 text-violet-500 animate-spin mb-4" />
                <p className="text-slate-400 font-bold capitalize tracking-widest text-[11px]">Syncing Performance Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-700 bg-[#FBFAFF]/50 p-4 rounded-[2.5rem]">
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                <div>
                    <h1 className="text-[28px] font-bold text-[#2D2852] tracking-tight">Employee Performance Dashboard</h1>
                    <p className="text-[#8E8AA0] text-[14px] font-medium tracking-tight">Cross-Department Team Performance Monitoring</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {isCFO && (
                        <div className="flex items-center gap-3 bg-white/80 border border-slate-100 rounded-2xl px-4 py-2.5 shadow-sm min-w-[220px]">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dept</span>
                            <CustomSelect
                                options={departments.map(d => ({ label: d.name, value: d.department_id || d.id }))}
                                value={selectedDept}
                                onChange={setSelectedDept}
                                className="!border-none !shadow-none !bg-transparent !p-0 !text-[#2D2852] font-bold"
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-white/80 border border-slate-100 rounded-2xl p-1.5 shadow-sm">
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-[12px] font-bold text-slate-600 focus:ring-0 px-2 py-1"
                            value={fromDate}
                            onChange={(e) => handleDateChange('from', e.target.value)}
                        />
                        <span className="text-slate-200">|</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-[12px] font-bold text-slate-600 focus:ring-0 px-2 py-1"
                            value={toDate}
                            onChange={(e) => handleDateChange('to', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 px-4">
                {/* Left: Chart & Table */}
                <div className="space-y-6">
                    {/* Activity Trend Chart */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 h-[400px] flex flex-col">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h3 className="text-[18px] font-bold text-[#2D2852]">Execution Summary: 30 Days</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[12px] text-[#A19EB6] font-medium">Real-time team execution data</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#4285F4]" />
                                    <span className="text-[11px] font-bold text-[#8E8AA0]">New</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#EAB308]" />
                                    <span className="text-[11px] font-bold text-[#8E8AA0]">Pending</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                                    <span className="text-[11px] font-bold text-[#8E8AA0]">Overdue</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trends}>
                                    <defs>
                                        <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4285F4" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#4285F4" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fontSize: 11, fontWeight: 'medium', fill: '#A19EB6'}}
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fontSize: 11, fontWeight: 'medium', fill: '#A19EB6'}}
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '1.25rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="new" stroke="#4285F4" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" />
                                    <Area type="monotone" dataKey="pending" stroke="#EAB308" strokeWidth={3} fillOpacity={0} />
                                    <Area type="monotone" dataKey="overdue" stroke="#EF4444" strokeWidth={3} fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Team Performance Table */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                             <h3 className="text-[18px] font-bold text-[#2D2852]">Team Performance Insights</h3>
                        </div>
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-left">
                                 <thead className="bg-[#FAF9FF] text-[12px] font-bold text-[#A19EB6] uppercase tracking-wider border-b border-slate-50">
                                    <tr>
                                        <th className="py-4 px-8">Employee</th>
                                        <th className="py-4 px-4 text-center">Assigned</th>
                                        <th className="py-4 px-4 text-center">In Progress</th>
                                        <th className="py-4 px-4 text-center">Pending Review</th>
                                        <th className="py-4 px-4 text-center text-rose-500">Overdue</th>
                                        <th className="py-4 px-8 text-right">Completion Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {teamPerformance.map((emp, i) => (
                                        <tr key={i} className="group hover:bg-[#FDFDFF] transition-colors">
                                            <td className="py-4 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#F3F0FF] border border-[#E5E0FF] text-[#7C3AED] flex items-center justify-center font-bold text-sm group-hover:bg-[#7C3AED] group-hover:text-white transition-all">
                                                        {(emp.name || 'U').charAt(0)}
                                                    </div>
                                                    <span className="text-[14px] font-bold text-[#4B447A]">{emp.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center font-bold text-[#6B7280]">{emp.tasks_assigned || 0}</td>
                                            <td className="py-4 px-4 text-center font-bold text-[#6366F1]">{emp.in_progress || 0}</td>
                                            <td className="py-4 px-4 text-center font-bold text-[#F59E0B]">{emp.pending_review || 0}</td>
                                            <td className="py-4 px-4 text-center font-bold text-[#EF4444]">{emp.overdue || 0}</td>
                                            <td className="py-4 px-8">
                                                <div className="flex items-center justify-end gap-3">
                                                    <div className="flex-1 max-w-[100px] h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-700 ${
                                                                (emp.completion_rate || 0) >= 80 ? 'bg-[#10B981]' : 
                                                                (emp.completion_rate || 0) >= 50 ? 'bg-[#F97316]' : 'bg-[#EF4444]'
                                                            }`} 
                                                            style={{ width: `${emp.completion_rate || 0}%` }} 
                                                        />
                                                    </div>
                                                    <span className="text-[13px] font-black text-[#2D2852]">{emp.completion_rate || 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Widgets: Risk + Dept Performance */}
                <div className="space-y-6">
                    {/* Employee Risk overview */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                             <h3 className="text-[18px] font-bold text-[#2D2852]">Employee Risk</h3>
                             <button className="text-[12px] font-bold text-[#8B5CF6] hover:underline">View All</button>
                        </div>
                        <div className="space-y-5">
                            {employeeRisk.map((emp, i) => {
                                const statusColor = {
                                    'ON_TRACK': 'bg-emerald-500',
                                    'WATCH': 'bg-amber-400',
                                    'AT_RISK': 'bg-orange-500',
                                    'OFF_TRACK': 'bg-rose-500'
                                }[emp.risk_status] || 'bg-slate-300';

                                return (
                                    <div key={i} className="flex items-center justify-between group cursor-default">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-400">
                                                {(emp.name || 'U').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-bold text-[#2D2852] group-hover:text-[#7C3AED] transition-colors">{emp.name}</p>
                                                <p className="text-[11px] text-[#A19EB6] font-medium tracking-tight">Active Tasks</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-[#A19EB6]">
                                                {emp.risk_status?.split('_').join(' ') || 'WATCH'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Department Performance widget */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col items-center">
                        <div className="w-full mb-8">
                             <h3 className="text-[18px] font-bold text-[#2D2852]">Department Score</h3>
                             <p className="text-[12px] text-[#A19EB6] font-medium mt-1 uppercase tracking-widest">{currentDeptName}</p>
                        </div>

                        {/* Circular Progress */}
                        <div className="relative flex items-center justify-center mb-10 w-48 h-48">
                            <svg className="w-full h-full -rotate-90">
                                <circle 
                                    cx="50%" cy="50%" r="78" 
                                    fill="white" 
                                    stroke="#F1F5F9" 
                                    strokeWidth="12" 
                                />
                                <circle 
                                    cx="50%" cy="50%" r="78" 
                                    fill="transparent" 
                                    stroke="url(#gradientPerf)" 
                                    strokeWidth="12" 
                                    strokeDasharray={2 * Math.PI * 78}
                                    strokeDashoffset={(2 * Math.PI * 78) * (1 - (deptMetrics?.completion_pct || 0) / 100)}
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient id="gradientPerf" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#10B981" />
                                        <stop offset="100%" stopColor="#8B5CF6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-[42px] font-black text-[#2D2852] leading-none mb-1">{deptMetrics?.completion_pct || 0}%</span>
                                <span className="text-[11px] font-bold text-[#A19EB6] uppercase tracking-widest">Efficiency</span>
                            </div>
                        </div>

                        <div className="w-full border-t border-slate-50 pt-8 mt-4 space-y-4">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-[#A19EB6]">
                                <span>Completed Tasks</span>
                                <span className="text-[#10B981]">{deptMetrics?.completed_tasks || 0}</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
                                <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${deptMetrics?.completion_pct || 0}%` }} />
                            </div>
                        </div>

                        <button className="w-full mt-10 py-4 bg-[#7C3AED] text-white rounded-[1.25rem] font-bold text-[14px] shadow-lg shadow-violet-200 hover:bg-[#6D28D9] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2">
                            <Plus size={16} /> Assign Task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceDashboard;
