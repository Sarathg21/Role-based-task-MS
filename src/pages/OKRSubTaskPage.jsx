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
    const [loading, setLoading] = useState(!!okrId);
    const [selectedOKR, setSelectedOKR] = useState(null);
    const [subtasks, setSubtasks] = useState([]);
    const [deptStats, setDeptStats] = useState([]);
    const [filters, setFilters] = useState({
        from_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
        to_date: new Date().toISOString().slice(0, 10)
    });
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const fetchOKRDetail = async () => {
        if (!okrId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const params = {
                from_date: filters.from_date,
                to_date: filters.to_date
            };

            const [summaryRes, subtasksRes, deptsRes] = await Promise.all([
                api.get(`/reports/cfo/okr/objectives/${okrId}/summary`, { params }),
                api.get(`/reports/cfo/okr/objectives/${okrId}/subtasks`, { params }),
                api.get(`/reports/cfo/okr/objectives/${okrId}/departments`, { params })
            ]);

            setSelectedOKR(summaryRes.data?.data || summaryRes.data);
            setSubtasks(subtasksRes.data?.data || subtasksRes.data || []);
            setDeptStats(deptsRes.data?.data || deptsRes.data || []);

        } catch (error) {
            console.error('Error fetching OKR details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOKRDetail();
    }, [okrId, filters]);

    const subTaskStats = useMemo(() => {
        if (!selectedOKR) return { total: 0, completed: 0, progress: 0 };
        return {
            total: selectedOKR.total_subtasks || 0,
            completed: selectedOKR.completed_subtasks || 0,
            progress: selectedOKR.progress_pct || 0
        };
    }, [selectedOKR]);

    const deptDistribution = useMemo(() => {
        return deptStats.map(d => ({
            name: d.department_name,
            value: d.total_subtasks,
            fill: ['#1e40af', '#16a34a', '#5b21b6', '#ea580c'][Math.floor(Math.random() * 4)]
        }));
    }, [deptStats]);

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
        <div className="flex flex-col gap-4 bg-[#f4f7fa] p-4 text-slate-800">
            <div className="page-container">
                {/* ── TOP KPI CARDS ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
                    {[
                        { label: 'Subtasks Total', value: selectedOKR?.total_subtasks || 0, color: 'border-blue-500' },
                        { label: 'Subtasks Done', value: selectedOKR?.completed_subtasks || 0, color: 'border-indigo-500' },
                        { label: 'Progress (%)', value: `${selectedOKR?.progress_pct || 0}%`, color: 'border-blue-800' },
                        { label: 'Health Score', value: selectedOKR?.health_score || 0, color: 'border-amber-500' },
                        { label: 'Risk Rating', value: selectedOKR?.risk_rating || 'Normal', color: 'border-rose-500', valueColor: selectedOKR?.risk_rating?.toLowerCase().includes('high') ? 'text-rose-600' : 'text-slate-800' },
                        { label: 'Days Remaining', value: selectedOKR?.days_left || 0, color: 'border-emerald-500', valueColor: 'text-emerald-600' },
                    ].map((m, i) => (
                        <div key={i} className={`bg-white p-5 rounded-2xl border-b-[3px] ${m.color} shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all hover:shadow-md hover:-translate-y-1 group`}>
                            <span className="text-[14px] font-medium text-slate-500 group-hover:text-slate-600 text-center capitalize tracking-tight leading-normal mb-1">{m.label}</span>
                            <span className={`text-3xl font-semibold ${m.valueColor || 'text-slate-900'} tracking-tighter tabular-nums`}>{m.value}</span>
                        </div>
                    ))}
                </div>

                {/* ── FILTER BAR ── */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-3 sm:gap-6 mb-8 text-[12px] font-bold text-slate-600">
                    <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold capitalize tracking-[0.12em] text-[10px]">Active Objective:</span>
                        <div className="flex items-center gap-2">
                            <span className="text-indigo-600 font-black tracking-tight">{selectedOKR?.parent_task_title || okrId}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        <span className="text-slate-400 text-[10px] capitalize">From</span>
                        <input 
                            type="date" 
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-700" 
                            value={filters.from_date}
                            onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] capitalize">To</span>
                        <input 
                            type="date" 
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-700" 
                            value={filters.to_date}
                            onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                        />
                    </div>

                    <button 
                        onClick={fetchOKRDetail}
                        className="bg-indigo-600 text-white px-6 py-1.5 rounded-xl font-bold text-[11px] capitalize tracking-widest shadow-sm hover:bg-indigo-700 transition-all ml-auto active:scale-95"
                    >
                        Refresh
                    </button>
                    <button 
                        onClick={() => navigate('/okr-dashboard')}
                        className="bg-slate-100 text-slate-600 px-6 py-1.5 rounded-xl font-bold text-[11px] capitalize tracking-widest border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
                    >
                        Dashboard
                    </button>
                </div>

                {/* ── MAIN CONTENT: PROGRESS OVERVIEW ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
                    <div className="bg-[#1e1b4b] px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-[14px] font-bold text-white flex items-center gap-3">
                            <Target size={18} className="text-indigo-400" />
                            Objective Drilldown: <span className="text-indigo-200">{selectedOKR.parent_task_title}</span>
                        </h3>
                        <div className="flex gap-4 items-center">
                              <div className="flex items-center gap-2 text-[10px] font-medium capitalize tracking-widest text-indigo-200/60">
                                <Clock size={12} />
                                {selectedOKR.days_left} Days Left
                              </div>
                              <div className={`px-4 py-1.5 rounded-full text-[10px] font-medium capitalize tracking-wider ${
                                  selectedOKR.risk_rating?.toLowerCase().includes('high') ? 'bg-rose-500 text-white' :
                                  selectedOKR.risk_rating?.toLowerCase().includes('medium') ? 'bg-amber-100 text-amber-700' :
                                  'bg-emerald-500 text-white'
                              }`}>
                                {selectedOKR.risk_rating} Risk
                              </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-0">
                        {/* Table Area */}
                        <div className="border-r border-slate-100 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="text-[10px] text-slate-500 font-bold capitalize tracking-widest bg-[#f1f5f9] border-y border-slate-200">
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
                                    {subtasks.length > 0 ? subtasks.map((st, idx) => (
                                        <tr key={idx} className="text-[12px] hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4 font-medium text-slate-500">ST-{idx+1}</td>
                                            <td className="py-3 px-4 font-semibold">{st.subtask_title}</td>
                                            <td className="py-3 px-4 font-medium text-slate-500">{st.department_name}</td>
                                            <td className="py-3 px-4 font-semibold">{st.assigned_to_name}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-3 py-1 rounded-md text-[10px] font-semibold capitalize ${
                                                    st.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                    st.status === 'SUBMITTED' ? 'bg-blue-800 text-white' :
                                                    st.status === 'OVERDUE' ? 'bg-rose-600 text-white' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {st.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-medium text-slate-500">{st.due_date}</td>
                                            <td className={`py-3 px-4 text-center font-semibold ${
                                                st.days_left_text?.toLowerCase().includes('late') ? 'text-rose-600' :
                                                'text-slate-700'
                                            }`}>
                                                {st.days_left_text}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="7" className="py-8 text-center text-slate-400 italic">No subtask data found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Chart Area */}
                        <div className="p-6 flex flex-col items-center">
                            <div className="w-full flex items-center justify-between mb-2">
                                <span className="text-[11px] font-medium text-slate-800">Subtasks Progress <span className="text-blue-700 font-semibold">{selectedOKR.completed_subtasks} / {selectedOKR.total_subtasks}</span></span>
                                <span className="text-sm font-semibold text-blue-800">{selectedOKR.progress_pct}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6 border border-slate-200">
                                <div className="h-full bg-blue-700" style={{ width: `${selectedOKR.progress_pct}%` }} />
                            </div>

                            <div className="w-full h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={deptDistribution}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}\n${value}`}
                                        />
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-4 flex items-center gap-4 w-full">
                                <div className="flex-1 flex justify-between items-center bg-slate-50 border border-slate-200 p-2 rounded">
                                    <span className="text-[10px] font-bold text-slate-400 capitalize tracking-widest">Health Score</span>
                                    <span className="text-lg font-black text-emerald-600">{selectedOKR.health_score}</span>
                                </div>
                                <div className={`px-4 py-1.5 rounded flex items-center gap-2 text-white ${
                                    selectedOKR.risk_rating?.toLowerCase().includes('high') ? 'bg-rose-600' :
                                    selectedOKR.risk_rating?.toLowerCase().includes('medium') ? 'bg-amber-500' :
                                    'bg-emerald-600'
                                }`}>
                                    <span className="text-sm font-black">{selectedOKR.risk_rating}</span>
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
                    <div className="p-6 flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-8">
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={deptDistribution}
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
                                    <thead className="bg-[#f1f5f9] text-slate-500 font-black border-y border-slate-200 text-[10px] capitalize tracking-widest">
                                        <tr>
                                            <th className="py-2 px-4 border-r border-slate-200">Department</th>
                                            <th className="py-2 px-4 border-r border-slate-200 text-center">Total</th>
                                            <th className="py-2 px-4 border-r border-slate-200 text-center">Pending</th>
                                            <th className="py-2 px-4 border-r border-slate-200 text-center">In Progress</th>
                                            <th className="py-2 px-4 border-r border-slate-200 text-center">Submitted</th>
                                            <th className="py-2 px-4 text-center">Approved</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-bold text-slate-700 divide-y divide-slate-100">
                                        {deptStats.length > 0 ? deptStats.map((r, i) => (
                                            <tr key={i} className="hover:bg-slate-50 text-[11px]">
                                                <td className="py-3 px-4 border-r border-slate-100">{r.department_name}</td>
                                                <td className="py-3 px-4 text-center border-r border-slate-100">{r.total_subtasks}</td>
                                                <td className="py-3 px-4 text-center border-r border-slate-100">{r.pending}</td>
                                                <td className="py-3 px-4 text-center border-r border-slate-100">{r.in_progress}</td>
                                                <td className="py-3 px-4 text-center border-r border-slate-100">{r.submitted}</td>
                                                <td className="py-3 px-4 text-center font-black text-emerald-600">{r.approved}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="py-8 text-center text-slate-400 italic">No department contribution data</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-auto flex justify-end gap-3">
                                <div className={`px-4 py-2 rounded flex items-center gap-2 text-white ${
                                    selectedOKR.risk_rating?.toLowerCase().includes('high') ? 'bg-rose-600' :
                                    selectedOKR.risk_rating?.toLowerCase().includes('medium') ? 'bg-amber-500' :
                                    'bg-emerald-600'
                                }`}>
                                    <CheckCircle2 size={16} />
                                    <span className="text-sm font-black">{selectedOKR.risk_rating} Risk</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 px-6 py-2 rounded text-[16px] font-black text-blue-900">
                                    {selectedOKR.progress_pct}% Total Progress
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
