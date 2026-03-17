import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { 
    AlertTriangle, CheckCircle, Clock, Target, Users, TrendingUp, 
    ArrowUpRight, ArrowDownRight, MoreHorizontal, Loader2
} from 'lucide-react';

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
                { label: 'Total Objectives', value: data.total_objectives || 0, border: 'border-blue-500' },
                { label: 'Total Subtasks', value: data.total_subtasks || 0, border: 'border-blue-700' },
                { label: 'Completed Tasks', value: data.completed_tasks || 0, border: 'border-emerald-500' },
                { label: 'Overall Progress', value: `${data.overall_progress || 0}%`, border: 'border-amber-500' },
                { label: 'At Risk Objectives', value: data.at_risk || 0, border: 'border-rose-500', valueColor: 'text-rose-600' },
                { label: 'Average Health Score', value: data.avg_health_score || 0, border: 'border-emerald-600', valueColor: 'text-emerald-600' },
            ]);

            setObjCompletionData((data.objective_completion || []).map(o => ({
                name: o.objective_title,
                value: o.progress_pct,
                color: o.progress_pct > 80 ? '#10b981' : o.progress_pct > 50 ? '#3b82f6' : '#ef4444'
            })));

            setDeptContributionData((data.department_contribution || []).map((d, i) => ({
                name: d.department_name,
                value: d.subtask_count,
                fill: ['#4f46e5', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][i % 5]
            })));

            setRiskOverview((data.risk_overview || []).map(r => ({
                label: r.objective_title,
                status: r.risk_rating,
                score: r.health_score,
                color: r.risk_rating?.toLowerCase().includes('high') ? 'bg-rose-500 text-white shadow-lg' :
                       r.risk_rating?.toLowerCase().includes('medium') ? 'bg-[#fef3c7] text-[#92400e] border border-amber-200' :
                       'bg-[#10b981] text-white shadow-md'
            })));

            // Using objective_completion as table data source as it has the IDs needed for navigation
            setTableData((data.objective_completion || []).map(o => ({
                id: o.parent_task_id || o.id,
                objective: o.objective_title || o.objective,
                progress: o.progress_pct || o.progress || 0,
                subComp: o.completed_subtasks || o.sub_comp || 0,
                subTotal: o.total_subtasks || o.sub_total || 0,
                depts: o.department_count || o.dept_count || o.depts || 0,
                days: o.total_days || o.days_total || 45,
                left: o.days_left || o.days_remaining || 0,
                score: o.health_score || o.score || 0,
                rating: o.risk_rating || o.risk_level || o.rating || 'Normal',
                ratingColor: (o.risk_rating || o.risk_level || o.rating || 'Normal').toLowerCase().includes('high') ? 'bg-rose-100 text-rose-700' :
                             (o.risk_rating || o.risk_level || o.rating || 'Normal').toLowerCase().includes('medium') ? 'bg-amber-100 text-amber-700' :
                             'bg-emerald-100 text-emerald-700'
            })));

            setTrendData((data.completion_trend || []).map(t => ({
                name: t.month,
                value: t.completed_tasks
            })));

            // We can reuse the overdue tasks endpoint if it's there
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
            <div className="flex flex-col items-center justify-center min-h-[600px] bg-[#f4f6f9] gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-bold capitalize tracking-widest text-xs">Syncing OKR Execution Data...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 bg-[#f4f7fa] p-4 text-slate-800">
            {/* Header */}
            <header className="bg-[#1e40af] text-white py-3 px-6 rounded-lg flex justify-between items-center shadow-md">
                <span className="font-black capitalize tracking-widest text-lg">Fj Group — OKR Execution Dashboard</span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[11px]">
                        <span>From:</span>
                        <input 
                            type="date" 
                            className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-white" 
                            value={filters.from_date}
                            onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                        <span>To:</span>
                        <input 
                            type="date" 
                            className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-white" 
                            value={filters.to_date}
                            onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                        />
                    </div>
                </div>
            </header>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {metrics.map((m, i) => (
                    <div key={i} className={`bg-white p-5 rounded-2xl border-b-[3px] ${m.border} shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all hover:shadow-md hover:-translate-y-1 group`}>
                        <span className="text-[14px] font-medium text-slate-500 group-hover:text-slate-600 text-center capitalize tracking-tight leading-normal mb-1">{m.label}</span>
                        <span className={`text-3xl font-medium ${m.valueColor || 'text-slate-900'} tracking-tighter tabular-nums`}>{m.value}</span>
                    </div>
                ))}
            </div>

            {/* Middle Section: Charts */}
            <div className="grid grid-cols-3 gap-4">
                {/* Objective Completion */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[350px]">
                    <h3 className="text-[13px] font-medium text-slate-400 mb-6 text-center capitalize tracking-widest">Objective Progress (Pct)</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={objCompletionData} 
                                layout="vertical" 
                                margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
                            >
                                <XAxis type="number" hide domain={[0, 100]} />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={120}
                                    tick={(props) => {
                                        const { x, y, payload } = props;
                                        const label = payload.value.length > 20 ? payload.value.substring(0, 18) + '...' : payload.value;
                                        return (
                                            <text x={x} y={y} dy={4} textAnchor="end" fill="#64748b" fontSize={10} fontWeight={800} className="capitalize tracking-tight">
                                                {label}
                                            </text>
                                        );
                                    }}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={16}>
                                    {objCompletionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Department Contribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[350px]">
                    <h3 className="text-[13px] font-medium text-slate-400 mb-6 text-center capitalize tracking-widest">Departmental Load</h3>
                    <div className="flex-1 min-h-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deptContributionData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {deptContributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    align="center"
                                    iconType="circle"
                                    wrapperStyle={{ 
                                        paddingTop: '20px',
                                        fontSize: '9px',
                                        fontWeight: 600,
                                        textTransform: 'capitalize',
                                        letterSpacing: '0.05em'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <span className="block text-[8px] font-medium text-slate-400 capitalize tracking-widest">Tasks</span>
                            <span className="block text-xl font-semibold text-slate-800">
                                {deptContributionData.reduce((acc, curr) => acc + curr.value, 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Risk Overview */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[350px]">
                    <h3 className="text-[13px] font-medium text-slate-400 mb-6 text-center capitalize tracking-widest">Critical Priorities</h3>
                    <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                        {riskOverview.length > 0 ? riskOverview.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-3.5 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-white transition-all group">
                                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 truncate max-w-[140px] capitalize tracking-tight">{r.label}</span>
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-semibold capitalize tracking-widest shadow-sm ${r.color}`}>
                                    {r.status}
                                </span>
                            </div>
                        )) : (
                            <div className="h-full flex items-center justify-center italic text-[15px] text-slate-400">No critical directives monitored.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Objective Progress Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-[#1e1b4b] text-white px-6 py-3.5 text-[15px] font-semibold capitalize tracking-widest flex items-center gap-2">
                    <Target size={15} className="text-indigo-400" />
                    Objective Progress Overview
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[13px] font-medium text-slate-400 capitalize tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="py-4 px-6">Task No</th>
                                <th className="py-4 px-4">Objective</th>
                                <th className="py-4 px-2 text-center">Depts</th>
                                <th className="py-4 px-2 text-center">Subtasks Done</th>
                                <th className="py-4 px-2 text-center">Total</th>
                                <th className="py-4 px-4 min-w-[140px]">Progress</th>
                                <th className="py-4 px-2 text-center">Days</th>
                                <th className="py-4 px-2 text-center">Remaining</th>
                                <th className="py-4 px-2 text-center">Health</th>
                                <th className="py-4 px-6 text-right">Risk</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tableData.map((row, i) => (
                                <tr 
                                    key={i} 
                                    className="text-[12px] font-semibold text-slate-700 group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/okr-subtask/${row.id}`)}
                                >
                                    <td className="py-4 px-6 font-medium text-slate-400">{row.id || `OBJ-00${i+1}`}</td>
                                    <td className="py-4 px-4 font-semibold text-slate-900 truncate max-w-[200px]" title={row.objective}>{row.objective}</td>
                                    <td className="py-4 px-2 text-center text-indigo-600 font-semibold">{row.depts || 0}</td>
                                    <td className="py-4 px-2 text-center text-slate-500 font-medium">{row.subComp}</td>
                                    <td className="py-4 px-2 text-center text-slate-900 font-semibold tabular-nums">{row.subTotal}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${row.progress > 80 ? 'bg-emerald-500' : row.progress > 50 ? 'bg-blue-600' : 'bg-rose-500'}`}
                                                    style={{ width: `${row.progress}%` }}
                                                />
                                            </div>
                                            <span className="w-8 text-[10px] font-semibold">{row.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 text-center font-semibold tabular-nums text-slate-400">{row.days}</td>
                                    <td className="py-4 px-2 text-center font-semibold tabular-nums text-emerald-600">{row.left}</td>
                                    <td className="py-4 px-2 text-center font-semibold text-indigo-600 tabular-nums">{row.score}</td>
                                    <td className="py-4 px-6 text-right">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-semibold capitalize tracking-wider ${row.ratingColor}`}>
                                            {row.rating}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-3 gap-4">
                {/* Risk Heatmap */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-4">
                    <h3 className="text-[13px] font-medium text-slate-500 capitalize tracking-widest">Risk Heatmap</h3>
                    <div className="space-y-2">
                        {riskOverview.length > 0 ? riskOverview.slice(0, 3).map((r, i) => (
                            <div key={i} className={`${r.color} p-3 rounded-md flex justify-between items-center transition-all hover:scale-[1.02]`}>
                                <span className="font-black text-xs capitalize tracking-tighter">{r.label}</span>
                                <span className="font-bold text-[10px] capitalize">{r.status}</span>
                            </div>
                        )) : (
                            <div className="text-center py-6 text-slate-400 text-xs italic">No risk data available</div>
                        )}
                    </div>
                </div>

                {/* Overdue Tasks */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-4">
                    <h3 className="text-[13px] font-medium text-slate-500 capitalize tracking-widest">Overdue Tasks</h3>
                    <div className="space-y-4 pt-2">
                        {overdueTasks.length > 0 ? overdueTasks.slice(0, 3).map((t, i) => (
                             <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[11px] font-bold text-slate-400">Task</span>
                                    <span className="text-xs font-black text-slate-800 truncate max-w-[150px]">{t.title}</span>
                                </div>
                                <span className="text-[10px] font-bold text-rose-500">{t.days_late} Days Late</span>
                            </div>
                        )) : (
                            <p className="text-center text-slate-400 text-xs py-4">No overdue tasks</p>
                        )}
                    </div>
                </div>

                {/* Completion Trend */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-4">
                    <h3 className="text-[13px] font-medium text-slate-500 capitalize tracking-widest text-center">Completion Trend</h3>
                    <div className="h-[150px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1) ">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" hide />
                                <YAxis hide domain={[0, 100]} />
                                <Tooltip />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#1e40af" 
                                    fillOpacity={1} 
                                    fill="url(#colorTrend)" 
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#1e40af', strokeWidth: 2, stroke: '#fff' }}
                                    label={({ x, y, value }) => (
                                        <text x={x} y={y - 10} fill="#1e40af" fontSize={10} fontWeight={900} textAnchor="middle">{value}%</text>
                                    )}
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
