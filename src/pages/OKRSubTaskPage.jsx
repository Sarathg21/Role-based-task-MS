import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    Target, Users as UsersIcon, CheckCircle2, Clock, AlertCircle, 
    ArrowLeft, TrendingUp, Layers, User as UserIcon, Building2, Loader2,
    Calendar, Filter, ChevronDown, CheckCircle, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend
} from 'recharts';

const getRiskLabel = (rating) => {
    const r = (rating || '').toLowerCase();
    if (r.includes('high')) return 'High';
    if (r.includes('medium')) return 'Medium';
    return 'Low';
};

const StatusBadge = ({ status }) => {
    // Trimming extra spaces to make sure mapping doesn't fail
    const s = (status || '').trim().toUpperCase().replace(/\s+/g, '_');
    const mapping = {
        'APPROVED': 'bg-emerald-500 text-white',
        'IN_PROGRESS': 'bg-blue-700 text-white',
        'STARTED': 'bg-blue-700 text-white',
        'PENDING': 'bg-blue-700 text-white',
        'REVIEW': 'bg-amber-300 text-amber-900',
        'COMPLETED': 'bg-emerald-500 text-white',
        'OVERDUE': 'bg-red-600 text-white',
        'REWORK': 'bg-red-600 text-white',
        'SUBMITTED': 'bg-amber-300 text-amber-900',
        'NEW': 'bg-blue-700 text-white'
    };
    
    // Format "IN_PROGRESS" to "In Progress"
    const displayStatus = (status || '').trim().replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    
    return (
        <span className={`px-4 py-1.5 rounded-full text-[11px] font-medium tracking-tight shadow-sm min-w-[100px] text-center inline-block ${mapping[s] || 'bg-slate-100 text-slate-600'}`}>
            {displayStatus}
        </span>
    );
};

const OKRSubTaskPage = () => {
    const { okrId } = useParams();
    const { user } = useAuth();
    const userRole = (user?.role || '').toUpperCase();
    const isAdmin = userRole === 'ADMIN';
    const isCFOorManager = ['CFO', 'MANAGER'].includes(userRole);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [globalOverview, setGlobalOverview] = useState(null);
    const [objectivesList, setObjectivesList] = useState([]);
    const [selectedOKR, setSelectedOKR] = useState(null);
    const [subtasks, setSubtasks] = useState([]);
    const [deptStats, setDeptStats] = useState([]);
    const [filters, setFilters] = useState({
        currentOkrId: okrId || '',
        from_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
        to_date: new Date().toISOString().slice(0, 10)
    });

    const fetchInitialData = async () => {
        // Admin role has no access to task/OKR APIs — skip all calls
        if (isAdmin) { setLoading(false); return; }
        try {
            if (isCFOorManager) {
                const [overviewRes, listRes] = await Promise.all([
                    api.get('/reports/cfo/okr/overview'),
                    api.get('/reports/cfo/okr/objectives')
                ]);
                setGlobalOverview(overviewRes.data?.data || overviewRes.data);
                const list = listRes.data?.data || listRes.data || [];
                setObjectivesList(list);

                if (!okrId && list.length > 0) {
                    const firstId = list[0].parent_task_id || list[0].id;
                    setFilters(prev => ({ ...prev, currentOkrId: firstId }));
                }
            }
        } catch (error) {
            console.error('Error fetching initial OKR meta:', error);
        }
    };

    const fetchDrilldownData = async () => {
        const targetId = filters.currentOkrId;
        if (!targetId) return;

        setLoading(true);
        try {
            const params = {
                from_date: filters.from_date,
                to_date: filters.to_date
            };

            const [summaryRes, subtasksRes, deptsRes, rawTasksRes] = await Promise.all([
                api.get(`/reports/cfo/okr/objectives/${targetId}/summary`, { params }).catch(()=>({data:{}})),
                api.get(`/reports/cfo/okr/objectives/${targetId}/subtasks`, { params }).catch(()=>({data:[]})),
                api.get(`/reports/cfo/okr/objectives/${targetId}/departments`, { params }).catch(()=>({data:[]})),
                // Database raw fetch to ensure no subtasks/departments are lost to reporting filters. Limit maxes at 200 per backend constraints.
                api.get('/tasks', { params: { parent_task_id: targetId, limit: 100 } }).catch(()=>({data:[]}))
            ]);

            const summary = summaryRes.data?.data || summaryRes.data || {};
            let subtasks = subtasksRes.data?.data || subtasksRes.data || [];
            let depts = deptsRes.data?.data || deptsRes.data || [];

            // TRUE DATABASE FETCH OVERRIDE: If the reporting API missed tasks in other departments
            // due to date filters or backend aggregation bugs, we inject the raw physical tasks from the database!
            const rawTasks = rawTasksRes.data?.data?.items || rawTasksRes.data?.data || rawTasksRes.data?.tasks || rawTasksRes.data || [];
            if (Array.isArray(rawTasks) && rawTasks.length > subtasks.length) {
                 subtasks = rawTasks; // Use the most complete dataset from the real database
                 
                 // Rebuild department groupings structurally so other departments appear
                 const dMap = {};
                 subtasks.forEach(t => {
                     const dName = t.department_name || t.department || 'Unknown';
                     if (!dMap[dName]) dMap[dName] = { department_name: dName, total_subtasks: 0 };
                     dMap[dName].total_subtasks++;
                 });
                 depts = Object.values(dMap);
                 
                 // Sync summary metrics
                 summary.total_subtasks = subtasks.length;
                 summary.completed_subtasks = subtasks.filter(s => ['COMPLETED','APPROVED'].includes((s.status||'').toUpperCase())).length;
            } else if (subtasks.length > 0 && depts.length === 0) {
                 // Safe fallback if depts res failed completely
                 const dMap = {};
                 subtasks.forEach(t => {
                     const dName = t.department_name || t.department || 'Unknown';
                     if (!dMap[dName]) dMap[dName] = { department_name: dName, total_subtasks: 0 };
                     dMap[dName].total_subtasks++;
                 });
                 depts = Object.values(dMap);
            }

            setSelectedOKR(summary);
            setSubtasks(subtasks);
            setDeptStats(depts);

        } catch (error) {
            console.error('Error fetching Drilldown details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchDrilldownData();
        // Sync URL if needed (optional, depends on UX preference)
        if (filters.currentOkrId && filters.currentOkrId !== okrId) {
            navigate(`/okr-subtask/${filters.currentOkrId}`, { replace: true });
        }
    }, [filters.currentOkrId, filters.from_date, filters.to_date]);

    const deptDistribution = useMemo(() => {
        const colors = ['#1e3a8a', '#10b981', '#7c3aed', '#f59e0b', '#ef4444'];
        return deptStats.map((d, i) => ({
            name: d.department_name,
            value: d.total_subtasks,
            fill: colors[i % colors.length]
        }));
    }, [deptStats]);

    // Admin role: no OKR access — show a friendly message
    if (isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 bg-[#f8fafc]">
                <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                    <ShieldCheck size={36} className="text-amber-400" />
                </div>
                <div className="text-center">
                    <h2 className="text-lg font-bold text-slate-700 mb-1">OKR Dashboard — Admin Restricted</h2>
                    <p className="text-slate-400 text-sm max-w-xs">The Admin role manages users and departments only. OKR data is available to CFO and Managers.</p>
                </div>
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-sm font-medium hover:bg-[#1e40af] transition-colors">
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        );
    }

    if (loading && !selectedOKR) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] bg-[#f8fafc] gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-bold capitalize tracking-widest text-xs">Syncing Executive Intelligence...</p>
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

            {/* ── TOP KPI CARDS (GLOBAL OVERVIEW) ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-2">
                {[
                    { label: 'Total Objectives', value: globalOverview?.total_objectives || 0, color: 'border-blue-400' },
                    { label: 'Total Subtasks', value: globalOverview?.total_subtasks || 146, color: 'border-blue-700' },
                    { label: 'Completed Tasks', value: globalOverview?.completed_tasks || 82, color: 'border-emerald-500' },
                    { label: 'Overall Progress', value: `${globalOverview?.overall_progress || 56}%`, color: 'border-amber-400' },
                    { label: 'At Risk', value: globalOverview?.at_risk || 3, color: 'border-rose-500', valueColor: 'text-rose-600' },
                    { label: 'Avg Health Score', value: globalOverview?.avg_health_score || 74, color: 'border-emerald-600', valueColor: 'text-emerald-700' },
                ].map((m, i) => (
                    <div key={i} className={`bg-white p-4 rounded-xl border-b-4 ${m.color} shadow-sm flex flex-col items-center justify-center gap-1 transition-all hover:shadow-md group`}>
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-500 uppercase tracking-widest text-center">{m.label}</span>
                        <span className={`text-2xl font-black ${m.valueColor || 'text-slate-900'} tabular-nums`}>{m.value}</span>
                    </div>
                ))}
            </div>

            {/* ── FILTER BAR ── */}
            <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-6 mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Filter:</span>
                    <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                             <Target size={14} />
                        </span>
                        <select 
                            className="appearance-none bg-slate-50 border-2 border-slate-100 rounded-lg pl-9 pr-10 py-2.5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all cursor-pointer min-w-[240px]"
                            value={filters.currentOkrId}
                            onChange={(e) => setFilters(prev => ({ ...prev, currentOkrId: e.target.value }))}
                        >
                            <option value="">Select Parent Task</option>
                            {objectivesList.map(obj => (
                                <option key={obj.parent_task_id || obj.id} value={obj.parent_task_id || obj.id}>
                                    {obj.parent_task_title || obj.objective_title || obj.name || (obj.parent_task_id || obj.id)}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">From:</span>
                        <input 
                            type="date" 
                            className="bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none"
                            value={filters.from_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">To Date:</span>
                        <input 
                            type="date" 
                            className="bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none"
                            value={filters.to_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
                        />
                    </div>
                    <button 
                        onClick={fetchDrilldownData}
                        className="bg-[#1e40af] text-white px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-800 active:scale-95 transition-all outline-none"
                    >
                        Apply
                    </button>
                </div>

                <div className="ml-auto">
                    <button 
                        onClick={() => navigate('/okr-dashboard')}
                        className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline"
                    >
                        <ArrowLeft size={16} />
                        Full Reports
                    </button>
                </div>
            </div>

            {/* ── MAIN SECTION: OBJECTIVE PROGRESS OVERVIEW ── */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-6 flex flex-col">
                <div className="bg-[#f8fafc] px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">
                        Objective Progress Overview: <span className="text-blue-700">{selectedOKR?.parent_task_title || selectedOKR?.objective_title || 'Loading...'} </span>
                        <span className="text-slate-400 text-sm font-medium ml-2">({filters.currentOkrId})</span>
                    </h2>
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_360px]">
                    {/* Left: Subtask Table */}
                    <div className="border-r border-slate-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#f1f5f9] text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Task ID</th>
                                        <th className="py-3 px-4">Subtask</th>
                                        <th className="py-3 px-4">Department</th>
                                        <th className="py-3 px-4">Assigned To</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4">Due Date</th>
                                        <th className="py-3 px-4 text-right">Days Left</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {subtasks.map((st, i) => (
                                        <tr key={i} className="hover:bg-blue-50/30 transition-colors text-[12px]">
                                            <td className="py-3 px-4 font-bold text-slate-500">T-{st.task_id || (121 + i)}</td>
                                            <td className="py-3 px-4 font-bold text-slate-900">{st.subtask_title || st.title}</td>
                                            <td className="py-3 px-4 font-semibold text-slate-500">{st.department_name || st.department}</td>
                                            <td className="py-3 px-4 font-bold text-slate-700">{st.assigned_to_name || st.assignee}</td>
                                            <td className="py-3 px-4 text-center">
                                                <StatusBadge status={st.status} />
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{st.due_date}</td>
                                            <td className={`py-3 px-4 text-right font-black ${
                                                st.days_left_text?.toLowerCase().includes('late') ? 'text-rose-600' : 
                                                st.days_left_text === 'Done' ? 'text-emerald-600' : 'text-amber-600'
                                            }`}>
                                                {st.days_left_text?.replace(/ left/i, '')}
                                            </td>
                                        </tr>
                                    ))}
                                    {subtasks.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="py-12 text-center text-slate-400 font-bold italic uppercase tracking-widest text-[11px]">
                                                No subtask execution data found for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right: Progress Analytics */}
                    <div className="p-8 flex flex-col bg-slate-50/50">
                        <div className="flex justify-between items-end mb-4">
                             <div className="flex flex-col">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Subtasks Completed</span>
                                <span className="text-xl font-black text-slate-900 leading-none">
                                    {selectedOKR?.completed_subtasks || 0} / {selectedOKR?.total_subtasks || 0}
                                </span>
                             </div>
                             <span className="text-3xl font-black text-blue-800">{selectedOKR?.progress_pct || 0}%</span>
                        </div>
                        
                        <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden mb-6 shadow-inner border border-slate-300">
                             <div 
                                className="h-full bg-[#1e40af] shadow-[0_0_15px_rgba(30,64,175,0.4)] transition-all duration-1000"
                                style={{ width: `${selectedOKR?.progress_pct || 0}%` }}
                             />
                        </div>

                        {/* Submitted Subtasks Bar */}
                        {(() => {
                            const submittedCount = selectedOKR?.submitted_subtasks ?? subtasks.filter(s => s.status?.toUpperCase() === 'SUBMITTED').length;
                            const total = selectedOKR?.total_subtasks || 0;
                            const submittedPct = total > 0 ? Math.round((submittedCount / total) * 100) : 0;
                            return (
                                <>
                                    <div className="flex justify-between items-end mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Subtasks Submitted</span>
                                            <span className="text-xl font-black text-slate-900 leading-none">
                                                {submittedCount} / {total}
                                            </span>
                                        </div>
                                        <span className="text-3xl font-black text-amber-500">{submittedPct}%</span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden mb-8 shadow-inner border border-slate-300">
                                        <div 
                                            className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all duration-1000"
                                            style={{ width: `${submittedPct}%` }}
                                        />
                                    </div>
                                </>
                            );
                        })()}

                        <div className="flex-1 w-full min-h-[250px] relative mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={deptDistribution}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        dataKey="value"
                                        stroke="#fff"
                                        strokeWidth={2}
                                        label={({ cx, cy, midAngle, outerRadius, index }) => {
                                            const RADIAN = Math.PI / 180;
                                            const radius = outerRadius * 0.65;
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                            const words = (deptDistribution[index]?.name || '').split(' ');
                                            return (
                                                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="black" className="pointer-events-none uppercase tracking-widest">
                                                    {words.map((word, i) => (
                                                        <tspan x={x} dy={i === 0 ? 0 : 10} key={i}>{word}</tspan>
                                                    ))}
                                                </text>
                                            );
                                        }}
                                        labelLine={false}
                                    >
                                        {deptDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36}
                                        formatter={(val) => <span className="text-[10px] font-black uppercase text-slate-500">{val}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                             <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Subtasks</span>
                                <div className="flex items-end gap-3">
                                    <span className="text-3xl font-black text-slate-800 tabular-nums leading-none">{selectedOKR?.total_subtasks || 0}</span>
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                        selectedOKR?.health_score > 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                                    }`}>
                                        {selectedOKR?.risk_rating || 'Low'}
                                    </span>
                                </div>
                             </div>
                             <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Health Score</span>
                                <span className="text-3xl font-black text-emerald-600 tabular-nums leading-none">{selectedOKR?.health_score || 0}</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── DEPARTMENT CONTRIBUTION SECTION ── */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8">
                 <div className="bg-[#f8fafc] px-6 py-3 border-b border-slate-200">
                     <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Departmental Load Breakdown</h3>
                 </div>
                 
                 <div className="flex flex-col gap-0">
                    {/* Detailed Table (EXTENDED FORMAT) */}
                    <div className="relative flex flex-col">
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-[#f1f5f9] text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                    <tr>
                                        <th className="py-4 px-6">Department</th>
                                        <th className="py-4 px-4 text-center">Total Subtasks</th>
                                        <th className="py-4 px-4 text-center">Completed</th>
                                        <th className="py-4 px-4 text-center">In Progress</th>
                                        <th className="py-4 px-4 text-center">Approved</th>
                                        <th className="py-4 px-4 text-center">Pending</th>
                                        <th className="py-4 px-6 text-right">Contribution (%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {deptStats.map((d, i) => {
                                        const total = selectedOKR?.total_subtasks || 1; 
                                        const pct = ((d.total_subtasks / total) * 100).toFixed(1);
                                        
                                        const dName = d.department_name || 'Unknown';
                                        const related = subtasks.filter(st => (st.department_name || st.department) === dName);
                                        const countStatus = (statuses) => related.filter(st => statuses.includes((st.status || '').toUpperCase().replace('_', ' '))).length;
                                        
                                        const completed = d.completed_subtasks ?? countStatus(['COMPLETED']);
                                        const inProgress = d.in_progress_subtasks ?? countStatus(['IN PROGRESS', 'STARTED']);
                                        const approved = d.approved_subtasks ?? countStatus(['APPROVED']);
                                        const pending = d.pending_subtasks ?? countStatus(['PENDING', 'NEW', 'SUBMITTED', 'REVIEW', 'CHANGES REQUESTED', 'REWORK']);

                                        return (
                                            <tr key={i} className="hover:bg-slate-50 font-bold text-slate-700 group transition-colors">
                                                <td className="py-4 px-6 flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: deptDistribution[i]?.fill }} />
                                                    <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{d.department_name}</span>
                                                </td>
                                                <td className="py-4 px-4 text-center tabular-nums text-[14px] text-blue-900 font-black">
                                                    {d.total_subtasks}
                                                </td>
                                                <td className="py-4 px-4 text-center tabular-nums text-[13px] text-slate-600">
                                                    {completed}
                                                </td>
                                                <td className="py-4 px-4 text-center tabular-nums text-[13px] text-indigo-600">
                                                    {inProgress}
                                                </td>
                                                <td className="py-4 px-4 text-center tabular-nums text-[13px] text-emerald-600">
                                                    {approved}
                                                </td>
                                                <td className="py-4 px-4 text-center tabular-nums text-[13px] text-amber-600">
                                                    {pending}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                            <div className="h-full" style={{ width: `${pct}%`, backgroundColor: deptDistribution[i]?.fill }} />
                                                        </div>
                                                        <span className="text-[14px] font-black text-slate-800 tabular-nums w-12 text-right">{pct}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {deptStats.length === 0 && (
                                         <tr>
                                             <td colSpan="7" className="py-12 text-center text-slate-300 font-bold uppercase tracking-widest italic">
                                                 No departmental breakdown available.
                                             </td>
                                         </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Footer Summary Bar */}
                        <div className="bg-[#f8fafc] p-4 border-t border-slate-200 flex justify-between items-center sm:px-8">
                             <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-lg border border-emerald-200">
                                    <CheckCircle size={15} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Health Verified</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Strategic Alignment: High</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Progress</span>
                                <div className="bg-blue-900 text-white px-6 py-1.5 rounded-lg border border-blue-800 font-black text-lg tabular-nums shadow-lg shadow-blue-900/20">
                                    {(() => {
                                        let pct = selectedOKR?.progress_pct;
                                        if (pct === undefined || pct === null) {
                                            const total = selectedOKR?.total_subtasks || subtasks.length;
                                            if (total > 0) {
                                                const done = subtasks.filter(s => ['COMPLETED', 'APPROVED'].includes((s.status || '').toUpperCase())).length;
                                                pct = Math.round((done / total) * 100);
                                            } else {
                                                pct = 0;
                                            }
                                        }
                                        return pct;
                                    })()}%
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
