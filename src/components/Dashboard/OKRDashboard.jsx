import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, LineChart, Line, AreaChart, Area
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

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [metricsRes, completionRes, deptRes, risksRes, tableRes, trendRes] = await Promise.all([
                api.get('/okrs/stats'),
                api.get('/okrs/completion'),
                api.get('/okrs/dept-contribution'),
                api.get('/okrs/risks'),
                api.get('/okrs/progress'),
                api.get('/okrs/trends')
            ]);

            setMetrics(metricsRes.data?.data || []);
            setObjCompletionData(completionRes.data?.data || []);
            setDeptContributionData(deptRes.data?.data || []);
            setRiskOverview(risksRes.data?.data || []);
            setTableData(tableRes.data?.data || []);
            setTrendData(trendRes.data?.data || []);
        } catch (error) {
            console.error('Error fetching OKR data:', error);
            // Fallback to mock data if API fails during transition
            setMetrics([
                { label: 'Total Objectives', value: 18, border: 'border-blue-500' },
                { label: 'Total Subtasks', value: 146, border: 'border-blue-700' },
                { label: 'Completed Tasks', value: 82, border: 'border-emerald-500' },
                { label: 'Overall Progress', value: '56%', border: 'border-amber-500' },
                { label: 'At Risk', value: 3, border: 'border-rose-500', valueColor: 'text-rose-600' },
                { label: 'Avg Health Score', value: 74, border: 'border-emerald-600', valueColor: 'text-emerald-600' },
            ]);
            setObjCompletionData([
                { name: 'OBJ-001', value: 75, color: '#3b82f6' },
                { name: 'OBJ-002', value: 50, color: '#1e3a8a' },
                { name: 'OBJ-003', value: 87, color: '#ef4444' },
            ]);
            setRiskOverview([
                { label: 'ERP Optimization', status: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                { label: 'Supplier Portal', status: 'High', color: 'bg-rose-100 text-rose-700 border-rose-200' },
                { label: 'Working Capital', status: 'Low', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            ]);
            setTableData([
                { id: 'OBJ-001', objective: 'Oracle ERP Optimization', depts: 4, subComp: 9, subTotal: 12, progress: 75, days: 60, left: 14, score: 82, rating: 'Medium', ratingColor: 'bg-amber-100 text-amber-700' },
                { id: 'OBJ-002', objective: 'Supplier Portal Rollout', depts: 3, subComp: 5, subTotal: 10, progress: 50, days: 45, left: 7, score: 65, rating: 'High', ratingColor: 'bg-rose-100 text-rose-700' },
                { id: 'OBJ-003', objective: 'Working Capital Program', depts: 5, subComp: 14, subTotal: 16, progress: 87, days: 90, left: 21, score: 91, rating: 'Low', ratingColor: 'bg-emerald-100 text-emerald-700' },
            ]);
            setDeptContributionData([
                { name: 'Finance', value: 24, fill: '#1e3a8a' },
                { name: 'IT', value: 18, fill: '#5b21b6' },
                { name: 'Procurement', value: 15, fill: '#10b981' },
            ]);
            setTrendData([
                { name: 'Start', value: 40 },
                { name: 'Feb', value: 58 },
                { name: 'Mar', value: 72 },
                { name: 'Now', value: 72 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] bg-[#f4f6f9] gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-bold capitalize tracking-widest text-xs">Syncing OKR Execution Data...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 bg-[#f4f6f9] p-4 font-['Aptos'] text-slate-800">
            {/* Header */}
            <header className="bg-[#1e40af] text-white py-3 px-6 rounded-lg text-center font-black capitalize tracking-widest text-lg shadow-md">
                Fj Group — Okr Execution Dashboard
            </header>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-6 gap-3">
                {metrics.map((m, i) => (
                    <div key={i} className={`bg-white p-4 rounded-md border-b-4 ${m.border} shadow-sm flex flex-col items-center justify-center gap-1`}>
                        <span className="text-[10px] font-bold text-slate-500 text-center capitalize tracking-tight">{m.label}</span>
                        <span className={`text-2xl font-black ${m.valueColor || 'text-slate-800'}`}>{m.value}</span>
                    </div>
                ))}
            </div>

            {/* Middle Section: Charts */}
            <div className="grid grid-cols-3 gap-4">
                {/* Objective Completion */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-500 mb-6 text-center capitalize">Objective Completion</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={objCompletionData} layout="vertical" margin={{ left: -20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                    {objCompletionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Department Contribution */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-500 mb-6 text-center capitalize">Department Contribution</h3>
                    <div className="h-[200px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deptContributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}\n${value}`}
                                >
                                    {deptContributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk Overview */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-500 mb-6 text-center capitalize">Risk Overview</h3>
                    <div className="space-y-3">
                        {riskOverview.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-md bg-slate-50/50">
                                <span className="text-sm font-bold text-slate-700">{r.label}</span>
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black capitalize border ${r.color}`}>
                                    {r.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Objective Progress Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-[#1e40af] text-white px-4 py-2 text-[11px] font-black capitalize">
                    Objective Progress Overview
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 capitalize border-b border-slate-100">
                            <tr>
                                <th className="py-3 px-4">Task No</th>
                                <th className="py-3 px-4">Objective</th>
                                <th className="py-3 px-2 text-center">Depts Involved</th>
                                <th className="py-3 px-2 text-center">Subtasks Comp</th>
                                <th className="py-3 px-2 text-center">Total Subtasks</th>
                                <th className="py-3 px-4 min-w-[120px]">Progress</th>
                                <th className="py-3 px-2 text-center">Total Days</th>
                                <th className="py-3 px-2 text-center">Days Left</th>
                                <th className="py-3 px-2 text-center">Health Score</th>
                                <th className="py-3 px-4 text-center">Risk Rating</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tableData.map((row, i) => (
                                <tr 
                                    key={i} 
                                    className="text-[12px] font-bold text-slate-700 group hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/okr-subtask/${row.id}`)}
                                >
                                    <td className="py-4 px-4">{row.id}</td>
                                    <td className="py-4 px-4">{row.objective}</td>
                                    <td className="py-4 px-2 text-center text-blue-800 font-black">{row.depts}</td>
                                    <td className="py-4 px-2 text-center text-slate-500 underline decoration-slate-300">{row.subComp} / {row.subTotal}</td>
                                    <td className="py-4 px-2 text-center text-slate-800 font-black">{Math.round((row.subTotal)*7.3)}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-1000"
                                                    style={{ width: `${row.progress}%` }}
                                                />
                                            </div>
                                            <span className="w-8 text-[10px] font-black">{row.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 text-center font-black">{row.days}</td>
                                    <td className="py-4 px-2 text-center font-black">{row.left}</td>
                                    <td className="py-4 px-2 text-center font-black text-emerald-600 underline decoration-emerald-200">{row.score}</td>
                                    <td className="py-4 px-4 text-center">
                                        <span className={`px-4 py-1 rounded-md text-[10px] font-black capitalize ${row.ratingColor}`}>
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
                    <h3 className="text-[10px] font-black text-slate-500 capitalize tracking-widest">Risk Heatmap</h3>
                    <div className="space-y-2">
                        <div className="bg-amber-100 text-amber-800 p-3 rounded-md flex justify-between items-center border border-amber-200">
                            <span className="font-black text-xs">ERP Optimization</span>
                            <span className="font-bold text-[10px]">MEDIUM</span>
                        </div>
                        <div className="bg-rose-500 text-white p-3 rounded-md flex justify-between items-center shadow-lg">
                            <span className="font-black text-xs uppercase tracking-tighter">Supplier Portal</span>
                            <span className="font-bold text-[10px]">HIGH</span>
                        </div>
                        <div className="bg-emerald-500 text-white p-3 rounded-md flex justify-between items-center shadow-md">
                            <span className="font-black text-xs uppercase tracking-tighter">Working Capital</span>
                            <span className="font-bold text-[10px]">LOW</span>
                        </div>
                    </div>
                </div>

                {/* Overdue Tasks */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-4">
                    <h3 className="text-[10px] font-black text-slate-500 capitalize tracking-widest">Overdue Tasks</h3>
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-bold text-slate-400">T-145</span>
                                <span className="text-xs font-black text-slate-800">System Testing</span>
                            </div>
                            <span className="text-[10px] font-bold text-rose-500">8 Days Late</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-bold text-slate-400">T-152</span>
                                <span className="text-xs font-black text-slate-800">Compliance Report</span>
                            </div>
                            <span className="text-[10px] font-bold text-rose-500">5 Days Late</span>
                        </div>
                    </div>
                </div>

                {/* Completion Trend */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-4">
                    <h3 className="text-[10px] font-black text-slate-500 capitalize tracking-widest text-center">Completion Trend</h3>
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
