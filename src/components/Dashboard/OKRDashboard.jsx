import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, AreaChart, Area, Legend, LabelList
} from 'recharts';
import { 
    AlertTriangle, CheckCircle, Clock, Target, Users, TrendingUp, 
    ArrowUpRight, ArrowDownRight, MoreHorizontal, Loader2,
    ShieldCheck, Calendar, ChevronDown, CheckCircle2
} from 'lucide-react';

const getRiskLabel = (rating) => {
    const r = (rating || '').toLowerCase();
    if (r.includes('high')) return 'High';
    if (r.includes('medium')) return 'Medium';
    return 'Low';
};

const OKRDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState([]);
    const [objCompletionData, setObjCompletionData] = useState([]);
    const [deptContributionData, setDeptContributionData] = useState([]);
    const [riskOverview, setRiskOverview] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [overdueTasks, setOverdueTasks] = useState([]);
    const [filters, setFilters] = useState({
        from_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
        to_date: new Date().toISOString().slice(0, 10)
    });

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/cfo/okr/overview', {
                params: {
                    from_date: filters.from_date,
                    to_date: filters.to_date
                }
            });
            const data = res.data?.data || res.data || {};

            setMetrics([
                { label: 'Total Objectives', value: data.total_objectives || 0, border: 'border-blue-400' },
                { label: 'Total Subtasks', value: data.total_subtasks || 0, border: 'border-blue-700' },
                { label: 'Completed Tasks', value: data.completed_tasks || 0, border: 'border-emerald-500' },
                { label: 'Overall Progress', value: `${data.overall_progress || 0}%`, border: 'border-amber-400' },
                { label: 'At Risk Objectives', value: data.at_risk || 0, border: 'border-rose-500', valueColor: 'text-rose-600' },
                { label: 'Average Health Score', value: data.avg_health_score || 0, border: 'border-emerald-600', valueColor: 'text-emerald-700' },
            ]);

            setObjCompletionData((data.objective_completion || []).map(obj => ({
                name: obj.objective_title,
                value: obj.progress_pct,
                color: obj.progress_pct >= 80 ? '#10b981' : obj.progress_pct >= 50 ? '#3b82f6' : '#ef4444'
            })));

            const colors = ['#1e3a8a', '#10b981', '#7c3aed', '#f59e0b', '#ef4444'];
            setDeptContributionData((data.department_contribution || []).map((dept, i) => ({
                name: dept.department_name,
                value: dept.subtask_count,
                fill: colors[i % colors.length]
            })));

            setRiskOverview((data.risk_overview || []).map(risk => {
                const label = getRiskLabel(risk.risk_rating);
                return {
                    label: risk.objective_title,
                    status: label,
                    score: risk.health_score,
                    color: label === 'High' ? 'bg-rose-500 text-white shadow-lg' :
                           label === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                           'bg-emerald-500 text-white shadow-md'
                };
            }));

            setTableData((data.objective_completion || []).map(o => {
                const riskLabel = getRiskLabel(o.risk_rating || o.risk_level || o.rating);
                return {
                    id: o.parent_task_id || o.id,
                    objective: o.objective_title || o.objective,
                    progress: o.progress_pct || o.progress || 0,
                    subComp: o.completed_subtasks || o.sub_comp || 0,
                    subTotal: o.total_subtasks || o.sub_total || 0,
                    depts: o.department_count || o.dept_count || o.depts || 0,
                    days: o.total_days || o.days_total || 45,
                    left: o.days_left || o.days_remaining || 0,
                    score: o.health_score || o.score || 0,
                    rating: riskLabel,
                    ratingColor: riskLabel === 'High' ? 'bg-rose-100 text-rose-700' :
                                 riskLabel === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                 'bg-emerald-100 text-emerald-700'
                };
            }));

            setTrendData((data.completion_trend || []).map(t => ({
                name: t.month,
                value: t.completed_tasks
            })));

            setOverdueTasks(data.overdue_tasks || []);

        } catch (error) {
            console.error('Error fetching OKR data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [filters]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] bg-[#f8fafc] gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-bold capitalize tracking-widest text-xs">Syncing OKR Execution Data...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 bg-[#f1f5f9] min-h-screen p-4 sm:p-6 text-slate-800 font-sans">
            {/* ── HEADER ── */}
            <div className="bg-[#1e3a8a] text-white py-3 px-6 rounded-xl flex justify-between items-center shadow-lg border border-white/10 mb-2">
                 <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
                        <ShieldCheck className="text-blue-200" size={24} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight uppercase">FJ GROUP — OKR EXECUTION DASHBOARD</h1>
                 </div>
                 <div className="hidden lg:flex items-center gap-3 text-xs font-bold text-blue-100/60 uppercase tracking-widest">
                    <Calendar size={14} />
                    <span>Real-time Strategic Insights</span>
                 </div>
            </div>

            {/* ── TOP KPI CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {metrics.map((m, i) => (
                    <div key={i} className={`bg-white p-4 rounded-xl border-b-4 ${m.border} shadow-sm flex flex-col items-center justify-center gap-1 transition-all hover:shadow-md group`}>
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-500 uppercase tracking-widest text-center">{m.label}</span>
                        <span className={`text-2xl font-black ${m.valueColor || 'text-slate-900'} tabular-nums`}>{m.value}</span>
                    </div>
                ))}
            </div>

            {/* ── MAIN CHARTS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Objective Progress */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                            <Target size={16} className="text-blue-600" />
                            Objective Achievement
                        </h3>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={objCompletionData} layout="vertical" margin={{ left: -10, right: 60 }}>
                                <XAxis type="number" hide domain={[0, 100]} />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={140}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                />
                                <Tooltip cursor={{ fill: '#f1f5f9', radius: 4 }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                                    {objCompletionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                    <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: '11px', fontWeight: '900', fill: '#1e3a8a' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Departmental Load */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                            <Users size={16} className="text-teal-600" />
                            Departmental Load
                        </h3>
                    </div>
                    <div className="flex-1 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deptContributionData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="#fff"
                                    strokeWidth={3}
                                >
                                    {deptContributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={50}
                                    formatter={(val) => <span className="text-[10px] font-black uppercase text-slate-500">{val}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk Overview */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[400px]">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <AlertTriangle size={16} className="text-rose-500" />
                        Risk Overview
                    </h3>
                    <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                        {riskOverview.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-white transition-all group border-l-4 border-l-transparent hover:border-l-blue-500">
                                <span className="text-[11px] font-bold text-slate-700 truncate flex-1 uppercase tracking-tight" title={r.label}>{r.label}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-blue-700 font-black text-xs">{r.score}</span>
                                    <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-sm ${r.color}`}>
                                        {r.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── TABLE VIEW ── */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-[#1e1b4b] text-white px-6 py-4 flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-[0.15em] flex items-center gap-3">
                        <Target size={18} className="text-indigo-400" />
                        Objective Progress Matrix
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                             <input 
                                type="date" 
                                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-xs text-white outline-none" 
                                value={filters.from_date}
                                onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                            />
                            <span className="text-white/20">/</span>
                            <input 
                                type="date" 
                                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-xs text-white outline-none" 
                                value={filters.to_date}
                                onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f8fafc] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="py-4 px-6">OBJ ID</th>
                                <th className="py-4 px-4 w-[30%]">Objective</th>
                                <th className="py-4 px-2 text-center">Depts</th>
                                <th className="py-4 px-2 text-center">Done</th>
                                <th className="py-4 px-2 text-center">Total</th>
                                <th className="py-4 px-4 min-w-[150px]">Progress</th>
                                <th className="py-4 px-2 text-center">Health</th>
                                <th className="py-4 px-6 text-right">Risk</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tableData.map((row, i) => (
                                <tr 
                                    key={i} 
                                    className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/okr-subtask/${row.id}`)}
                                >
                                    <td className="py-4 px-6 font-bold text-slate-400">OBJ-{row.id || (101 + i)}</td>
                                    <td className="py-4 px-4 font-black text-slate-800 tracking-tight">{row.objective}</td>
                                    <td className="py-4 px-2 text-center text-blue-700 font-black">{row.depts}</td>
                                    <td className="py-4 px-2 text-center text-slate-500 font-bold">{row.subComp}</td>
                                    <td className="py-4 px-2 text-center text-slate-800 font-black tabular-nums">{row.subTotal}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${row.progress > 80 ? 'bg-emerald-500' : row.progress > 50 ? 'bg-blue-600' : 'bg-rose-500'}`}
                                                    style={{ width: `${row.progress}%` }}
                                                />
                                            </div>
                                            <span className="w-10 text-[11px] font-black text-blue-900">{row.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 text-center font-black text-emerald-600 tabular-nums">{row.score}</td>
                                    <td className="py-4 px-6 text-right">
                                        <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${row.ratingColor}`}>
                                            {row.rating}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── FOOTER ANALYTICS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Heatmap/Overdue Summary */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[280px]">
                     <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <Clock size={16} className="text-rose-500" />
                        Executive Criticals
                    </h3>
                    <div className="space-y-4">
                        {overdueTasks.slice(0, 3).map((t, i) => (
                             <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-3">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-slate-800 truncate max-w-[180px] uppercase tracking-tight">{t.title}</span>
                                    <span className="text-[9px] font-bold text-slate-400 capitalize">Critical Timeline</span>
                                </div>
                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded">{t.days_late}D Late</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Completion Trend */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[280px] col-span-1 md:col-span-2">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <TrendingUp size={16} className="text-blue-600" />
                        Enterprise Completion Trend
                    </h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis hide domain={[0, 'dataMax + 20']} />
                                <Tooltip />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#1e3a8a" 
                                    fillOpacity={1} 
                                    fill="url(#colorTrend)" 
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#1e3a8a', strokeWidth: 2, stroke: '#fff' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OKRDashboard;
