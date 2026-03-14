import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { OKRS, USERS } from '../data/mockData';
import { 
    Target, Users as UsersIcon, CheckCircle2, Clock, AlertCircle, 
    ArrowLeft, TrendingUp, Layers, User as UserIcon, Building2, Loader2
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

const OKRSubTaskPage = () => {
    const { okrId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [selectedOKR, setSelectedOKR] = useState(null);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const fetchOKRDetail = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/okrs/${okrId || 'OKR-1'}`);
            if (res.data?.data) {
                setSelectedOKR(res.data.data);
            } else {
                throw new Error('No data');
            }
        } catch (error) {
            console.error('Error fetching OKR details:', error);
            // Fallback to mock data
            const fallback = OKRS.find(o => o.id === okrId) || OKRS[0];
            
            // Build dept distribution if missing in mock
            if (!fallback.deptDistribution) {
                const stats = {};
                fallback.keyResults?.forEach(kr => {
                    kr.team?.forEach(empId => {
                        const user = USERS.find(u => u.id === empId);
                        const dept = user?.department || 'Unknown';
                        stats[dept] = (stats[dept] || 0) + 1;
                    });
                });
                fallback.deptDistribution = Object.entries(stats).map(([name, value]) => ({ name, value }));
            }
            setSelectedOKR(fallback);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOKRDetail();
    }, [okrId]);

    const subTaskStats = useMemo(() => {
        if (!selectedOKR) return { total: 0, completed: 0, progress: 0 };
        const total = selectedOKR.keyResults?.reduce((acc, kr) => acc + (kr.totalTasks || 0), 0) || 0;
        const completed = selectedOKR.keyResults?.reduce((acc, kr) => acc + (kr.completedTasks || 0), 0) || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : selectedOKR.progress || 0;
        return { total, completed, progress };
    }, [selectedOKR]);

    const deptDistribution = useMemo(() => {
        if (!selectedOKR) return [];
        return selectedOKR.deptDistribution || [];
    }, [selectedOKR]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-bold capitalize tracking-widest text-xs">Loading Objective Intelligence...</p>
            </div>
        );
    }

    if (!selectedOKR) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] gap-4">
                <AlertCircle className="w-12 h-12 text-rose-500" />
                <p className="text-slate-500 font-bold capitalize tracking-widest text-xs">Objective Not Found</p>
                <button onClick={() => navigate('/okr-dashboard')} className="text-blue-600 font-bold underline">Back to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="min-w-[1200px] bg-[#f8fafc] font-['Aptos'] text-slate-800 pb-12">
            {/* ── HEADER BAR ── */}
            <header className="bg-[#1e40af] text-white py-4 px-8 text-center font-black capitalize tracking-[0.2em] text-xl shadow-lg mb-6">
                FJ GROUP — OKR EXECUTION DASHBOARD
            </header>

            <div className="px-8">
                {/* ── TOP KPI CARDS ── */}
                <div className="grid grid-cols-6 gap-4 mb-6">
                    {[
                        { label: 'Total Objectives', value: '18', color: 'border-blue-500' },
                        { label: 'Total Subtasks', value: '146', color: 'border-indigo-500' },
                        { label: 'Completed Tasks', value: '82', color: 'border-blue-800' },
                        { label: 'Overall Progress', value: '56%', color: 'border-amber-500' },
                        { label: 'At Risk', value: '3', color: 'border-rose-500', valueColor: 'text-rose-600' },
                        { label: 'Avg Health Score', value: '74', color: 'border-emerald-500', valueColor: 'text-emerald-600' },
                    ].map((m, i) => (
                        <div key={i} className={`bg-white p-4 rounded-md border-b-4 ${m.color} shadow-sm flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105`}>
                            <span className="text-[11px] font-bold text-slate-500 text-center capitalize tracking-tight">{m.label}</span>
                            <span className={`text-2xl font-black ${m.valueColor || 'text-slate-800'}`}>{m.value}</span>
                        </div>
                    ))}
                </div>

                {/* ── FILTER BAR ── */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-6 mb-8 text-[12px] font-bold text-slate-600">
                    <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Filter:</span>
                        <div className="flex items-center gap-2">
                            <span>Parent Task ID:</span>
                            <select className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400">
                                <option>OBJ-003</option>
                                <option>OBJ-001</option>
                                <option>OBJ-002</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span>From:</span>
                        <input type="date" className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5" defaultValue="2024-01-01" />
                    </div>

                    <div className="flex items-center gap-2">
                        <span>To Date:</span>
                        <input type="date" className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5" defaultValue="2024-01-01" />
                    </div>

                    <button className="bg-[#1e40af] text-white px-6 py-1.5 rounded font-black text-[11px] capitalize tracking-widest shadow-md hover:bg-blue-800 transition-colors ml-auto">
                        APPLY
                    </button>
                </div>

                {/* ── MAIN CONTENT: PROGRESS OVERVIEW ── */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                        <h3 className="text-[14px] font-bold text-slate-700">
                            Objective Progress Overview: {selectedOKR.title} ({selectedOKR.id})
                        </h3>
                    </div>

                    <div className="grid grid-cols-[1fr_320px] gap-0">
                        {/* Table Area */}
                        <div className="border-r border-slate-100 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-[#f1f5f9] border-y border-slate-200">
                                    <tr>
                                        <th className="py-2 px-4 border-r border-slate-200">Task ID</th>
                                        <th className="py-3 px-4 border-r border-slate-200">Subtask</th>
                                        <th className="py-2 px-4 border-r border-slate-200">Department</th>
                                        <th className="py-2 px-4 border-r border-slate-200">Assigned To</th>
                                        <th className="py-2 px-4 border-r border-slate-200 text-center">Status</th>
                                        <th className="py-2 px-4 border-r border-slate-200">Due Date</th>
                                        <th className="py-2 px-4 text-center">Days Left</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(selectedOKR.keyResults || []).flatMap(kr => 
                                        kr.subtasks?.map(st => ({ ...st, krId: kr.id, krColor: kr.color })) || []
                                    ).map((st, idx) => (
                                        <tr key={idx} className="text-[12px] hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-500">{st.id || `T-${121 + idx}`}</td>
                                            <td className="py-3 px-4 font-black">{st.title || 'Inventory Analysis'}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{st.department || 'Finance'}</td>
                                            <td className="py-3 px-4 font-black">{st.assignee || 'Priya'}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-3 py-1 rounded-md text-[10px] font-black capitalize ${
                                                    st.status === 'Completed' ? 'bg-emerald-500 text-white' :
                                                    st.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                                    st.status === 'In Progress' ? 'bg-blue-800 text-white' :
                                                    st.status === 'Overdue' ? 'bg-rose-600 text-white' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {st.status || 'Approved'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{st.dueDate || '17 Apr'}</td>
                                            <td className={`py-3 px-4 text-center font-bold ${
                                                st.daysLeft === 'Done' ? 'text-slate-400' :
                                                st.status === 'Overdue' ? 'text-rose-600' :
                                                'text-slate-700'
                                            }`}>
                                                {st.daysLeft || 'Done'}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Mock rows if data is small */}
                                    {(!(selectedOKR.keyResults || []).flatMap(kr => kr.subtasks || []).length) && [
                                        { id: 'T-121', title: 'Inventory Analysis', dept: 'Finance', who: 'Priya', status: 'Approved', date: '17 Apr', left: 'Done', color: 'bg-emerald-100 text-emerald-700' },
                                        { id: 'T-122', title: 'Cash Flow Optimization', dept: 'Procurement', who: 'Vikram', status: 'In Progress', date: '20 Apr', left: 'Done', color: 'bg-blue-800 text-white' },
                                        { id: 'T-123', title: 'Payment Term Adjustments', dept: 'IT', who: 'Amit', status: 'Review', date: '25 Apr', left: '5 days left', color: 'bg-amber-100 text-amber-700' },
                                        { id: 'T-124', title: 'AP/AR Reconciliation Automation', dept: 'Finance', who: 'Rahul', status: 'Completed', date: '18 Apr', left: 'Done', color: 'bg-emerald-500 text-white' },
                                        { id: 'T-128', title: 'DSO/DOI Reduction Plan', dept: 'Finance', who: 'Nisha', status: 'Overdue', date: '15 Apr', left: '6 days late', color: 'bg-rose-600 text-white' },
                                    ].map((row, i) => (
                                        <tr key={i} className="text-[12px] hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-500">{row.id}</td>
                                            <td className="py-3 px-4 font-black">{row.title}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{row.dept}</td>
                                            <td className="py-3 px-4 font-black">{row.who}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-3 py-1 rounded-md text-[10px] font-black capitalize ${row.color}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{row.date}</td>
                                            <td className={`py-3 px-4 text-center font-bold ${row.left.includes('late') ? 'text-rose-600' : row.left === 'Done' ? 'text-slate-400' : 'text-slate-700'}`}>
                                                {row.left}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Chart Area */}
                        <div className="p-6 flex flex-col items-center">
                            <div className="w-full flex items-center justify-between mb-2">
                                <span className="text-[11px] font-black text-slate-800">Total Subtasks Completed <span className="text-blue-700">14 / 16</span></span>
                                <span className="text-sm font-black text-blue-800">87%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6 border border-slate-200">
                                <div className="h-full bg-blue-700" style={{ width: '87%' }} />
                            </div>

                            <div className="w-full h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Finance', value: 4, fill: '#1e40af' },
                                                { name: 'Procurement', value: 2, fill: '#16a34a' },
                                                { name: 'IT', value: 18, fill: '#5b21b6' },
                                                { name: 'Operations', value: 3, fill: '#ea580c' },
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}\n${value}`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-4 flex items-center gap-4 w-full">
                                <div className="flex-1 flex justify-between items-center bg-slate-50 border border-slate-200 p-2 rounded">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Subtasks</span>
                                    <span className="text-lg font-black text-blue-900">91</span>
                                </div>
                                <div className="bg-emerald-600 text-white px-3 py-1 rounded flex items-center gap-2">
                                    <span className="text-sm font-black">Low</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── DEPARTMENT CONTRIBUTION ── */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                        <h3 className="text-[14px] font-bold text-slate-700">Department Contribution</h3>
                    </div>
                    <div className="p-6 grid grid-cols-[280px_1fr] gap-8">
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Finance', value: 4, fill: '#1e40af' },
                                            { name: 'Procurement', value: 2, fill: '#16a34a' },
                                            { name: 'IT', value: 18, fill: '#5b21b6' },
                                            { name: 'Operations', value: 3, fill: '#ea580c' },
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={90}
                                        dataKey="value"
                                    />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="overflow-hidden border border-slate-100 rounded-lg">
                                <table className="w-full text-left text-[12px] border-collapse">
                                    <thead className="bg-[#f1f5f9] text-slate-500 font-black border-y border-slate-200 text-[10px] uppercase tracking-widest">
                                        <tr>
                                            <th className="py-2 px-4 border-r border-slate-200">Total Subtasks</th>
                                            <th className="py-2 px-4 border-r border-slate-200 text-center">Completed</th>
                                            <th className="py-2 px-4 border-r border-slate-200 text-center">In Progress</th>
                                            <th className="py-2 px-4 border-r border-slate-200 text-center">Approved</th>
                                            <th className="py-2 px-4 border-r border-slate-200 text-center">Approvd</th>
                                            <th className="py-2 px-4 text-center">Pending</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-bold text-slate-700 divide-y divide-slate-100">
                                        {[
                                            { total: 6, comp: 4, in: 1, app: 4, appd: 4, pen: 1 },
                                            { total: 4, comp: 2, in: 1, app: 2, appd: 1, pen: 0 },
                                            { total: 3, comp: 2, in: 0, app: 1, appd: 1, pen: 0 },
                                            { total: 3, comp: 2, in: 0, app: 1, appd: 1, pen: 0 },
                                        ].map((r, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="py-3 px-4 text-center">{r.total}</td>
                                                <td className="py-3 px-4 text-center">{r.comp}</td>
                                                <td className="py-3 px-4 text-center">{r.in}</td>
                                                <td className="py-3 px-4 text-center">{r.app}</td>
                                                <td className="py-3 px-4 text-center">{r.appd}</td>
                                                <td className="py-3 px-4 text-center">{r.pen}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-auto flex justify-end gap-3">
                                <div className="bg-emerald-600 text-white px-4 py-2 rounded flex items-center gap-2">
                                    <CheckCircle2 size={16} />
                                    <span className="text-sm font-black">Low</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 px-6 py-2 rounded text-[16px] font-black text-blue-900">
                                    87%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OKRSubTaskPage;
