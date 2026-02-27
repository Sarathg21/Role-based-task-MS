import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TASKS, USERS, DEPARTMENTS } from '../../data/mockData';
import { getEmployeeRankings } from '../../utils/rankingEngine';
import { calculateManagerScore } from '../../utils/performanceEngine';
import ChartPanel from '../Charts/ChartPanel';
import Badge from '../UI/Badge';
import StatsCard from '../UI/StatsCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    TrendingUp, Users, CheckSquare, AlertTriangle, ArrowRight,
    BarChart2, Building2, Star, CalendarCheck, Calendar
} from 'lucide-react';

/* ─── Helpers ──────────────────────────────────────────────────── */
const DEPT_COLORS = [
    '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6',
    '#ef4444', '#ec4899', '#14b8a6', '#f97316',
];



/* ─── CFO Dashboard ─────────────────────────────────────────────── */
const CFODashboard = () => {
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];
    const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    /* Date range state */
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    /* ── Computed metrics ─── */
    const {
        workloadData,
        deptPerformanceData,
        topPerformersByDept,
        topManagers,
        globalStats,
    } = useMemo(() => {
        const activeDepts = DEPARTMENTS.filter(d => USERS.some(u => u.department === d));

        /* Apply date range filter to all tasks */
        let filteredTasks = TASKS;
        if (fromDate) filteredTasks = filteredTasks.filter(t => t.assignedDate >= fromDate);
        if (toDate) filteredTasks = filteredTasks.filter(t => t.assignedDate <= toDate);

        /* Workload per department */
        const workloadData = activeDepts.map((dept, i) => {
            const deptUserIds = USERS.filter(u => u.department === dept).map(u => u.id);
            const deptTasks = filteredTasks.filter(t => deptUserIds.includes(t.employeeId));
            const completed = deptTasks.filter(t => t.status === 'APPROVED').length;
            return {
                name: dept.length > 14 ? dept.slice(0, 13) + '…' : dept,
                fullName: dept,
                Total: deptTasks.length,
                Completed: completed,
                Pending: deptTasks.length - completed,
                fill: DEPT_COLORS[i % DEPT_COLORS.length],
            };
        });

        /* Department performance index */
        const deptPerformanceData = activeDepts.map(dept => {
            const empIds = USERS.filter(u => u.department === dept && u.role === 'Employee').map(u => u.id);
            const deptTasks = filteredTasks.filter(t => empIds.includes(t.employeeId));
            const completed = deptTasks.filter(t => t.status === 'APPROVED').length;
            const score = deptTasks.length > 0 ? Math.round((completed / deptTasks.length) * 100) : 0;
            return { name: dept.length > 14 ? dept.slice(0, 13) + '…' : dept, fullName: dept, Performance: score };
        });

        /* Top performer per department — always based on full TASKS for rankings */
        const topPerformersByDept = activeDepts.map(dept => {
            const deptEmps = USERS.filter(u => u.department === dept && u.role === 'Employee');
            const ranked = getEmployeeRankings(deptEmps, TASKS);
            const top = ranked[0] || null;
            return { dept, top };
        }).filter(r => r.top !== null);

        /* Top managers by performance score */
        const managers = USERS.filter(u => u.role === 'Manager');
        const topManagers = managers.map(mgr => {
            const teamIds = USERS.filter(u => u.managerId === mgr.id).map(u => u.id);
            const score = calculateManagerScore(TASKS, mgr.id, teamIds);
            return { ...mgr, score };
        }).sort((a, b) => b.score - a.score);

        /* Global stats — filtered by date range */
        const totalTasks = filteredTasks.length;
        const completedTasks = filteredTasks.filter(t => t.status === 'APPROVED').length;
        const pendingTasks = filteredTasks.filter(t => !['APPROVED', 'CANCELLED'].includes(t.status)).length;
        const overallScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            workloadData,
            deptPerformanceData,
            topPerformersByDept,
            topManagers,
            globalStats: { totalTasks, completedTasks, pendingTasks, overallScore },
        };
    }, [fromDate, toDate]);

    return (
        <div className="space-y-5">

            {/* ══ HEADER WITH DATE RANGE ══ */}
            <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 40%, #a78bfa 100%)' }}
            >
                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/25 backdrop-blur-sm p-2.5 rounded-xl">
                            <CalendarCheck size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight">CFO Overview</h2>
                            <p className="text-violet-200 text-xs mt-0.5">{dateLabel}</p>
                        </div>
                    </div>

                    {/* Date range filter — premium styled */}
                    <div className="flex items-center gap-3 flex-wrap">

                        {/* Glassy date range card */}
                        <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 gap-3 shadow-inner">
                            {/* From */}
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-violet-200 uppercase tracking-widest flex items-center gap-1">
                                    <Calendar size={10} /> From
                                </span>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    className="text-sm font-medium bg-transparent text-white border-none outline-none cursor-pointer [color-scheme:dark] w-36"
                                />
                            </div>

                            {/* Arrow separator */}
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15">
                                <ArrowRight size={12} className="text-violet-200" />
                            </div>

                            {/* To */}
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-violet-200 uppercase tracking-widest flex items-center gap-1">
                                    <Calendar size={10} /> To
                                </span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    className="text-sm font-medium bg-transparent text-white border-none outline-none cursor-pointer [color-scheme:dark] w-36"
                                />
                            </div>
                        </div>

                        {/* Active filter badge + clear */}
                        {(fromDate || toDate) && (
                            <button
                                onClick={() => { setFromDate(''); setToDate(''); }}
                                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                            >
                                ✕ Clear Filter
                            </button>
                        )}

                        <button
                            onClick={() => navigate('/tasks')}
                            className="flex items-center gap-2 bg-white text-violet-700 hover:bg-violet-50 hover:scale-105 transition-all text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg"
                        >
                            All Tasks <ArrowRight size={15} />
                        </button>

                    </div>
                </div>
            </div>

            {/* ══ GLOBAL STATS ══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatsCard title="Total Tasks (Org)" value={globalStats.totalTasks} icon={CheckSquare} color="primary" compact />
                <StatsCard title="Completed" value={globalStats.completedTasks} icon={TrendingUp} color="success" compact />
                <StatsCard title="Pending" value={globalStats.pendingTasks} icon={AlertTriangle} color="warning" compact />
                <StatsCard title="Org. Score" value={`${globalStats.overallScore}%`} icon={BarChart2} color="purple" compact />
            </div>

            {/* ══ TOP PERFORMERS PER DEPARTMENT ══ */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Star size={16} className="text-amber-500" />
                    <h3 className="text-base font-semibold text-slate-800">Top Performers by Department</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="py-2 px-3">Department</th>
                                <th className="py-2 px-3">Top Employee</th>
                                <th className="py-2 px-3">Score</th>
                                <th className="py-2 px-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {topPerformersByDept.map(({ dept, top }) => (
                                <tr key={dept} className="hover:bg-slate-50">
                                    <td className="py-2 px-3 font-medium text-slate-700 max-w-[160px] truncate">{dept}</td>
                                    <td className="py-2 px-3 truncate">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                                {top.name.charAt(0)}
                                            </div>
                                            <span className="truncate">{top.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-2 px-3 text-violet-600 font-semibold">{top.score}</td>
                                    <td className="py-2 px-3">
                                        <Badge variant={top.score >= 80 ? 'success' : top.score >= 50 ? 'warning' : 'danger'}>
                                            {top.score >= 80 ? 'Excellent' : top.score >= 50 ? 'Average' : 'Needs Help'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                            {topPerformersByDept.length === 0 && (
                                <tr><td colSpan="4" className="py-6 text-center text-slate-500">No employee data available.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══ TOP MANAGERS ══ */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Users size={16} className="text-violet-500" />
                    <h3 className="text-base font-semibold text-slate-800">Top Managers by Performance Score</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="py-2 px-3">Rank</th>
                                <th className="py-2 px-3">Manager</th>
                                <th className="py-2 px-3">Department</th>
                                <th className="py-2 px-3">Score</th>
                                <th className="py-2 px-3">Rating</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {topManagers.map((mgr, i) => (
                                <tr key={mgr.id} className="hover:bg-slate-50">
                                    <td className="py-2 px-3 text-slate-400 font-semibold">#{i + 1}</td>
                                    <td className="py-2 px-3 truncate">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                                {mgr.name.charAt(0)}
                                            </div>
                                            {mgr.name}
                                        </div>
                                    </td>
                                    <td className="py-2 px-3 text-slate-500 truncate max-w-[140px]">{mgr.department}</td>
                                    <td className="py-2 px-3 text-violet-600 font-semibold">{mgr.score}</td>
                                    <td className="py-2 px-3">
                                        <Badge variant={mgr.score >= 80 ? 'success' : mgr.score >= 50 ? 'warning' : 'danger'}>
                                            {mgr.score >= 80 ? 'Excellent' : mgr.score >= 50 ? 'Average' : 'Low'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══ CHARTS ROW ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Workload Distribution */}
                <ChartPanel title="Workload Distribution by Department">
                    <BarChart data={workloadData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                            formatter={(value, name, props) => [value, name]}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                        />
                        <Legend />
                        <Bar dataKey="Completed" stackId="a" fill="#10b981" name="Completed" />
                        <Bar dataKey="Pending" stackId="a" fill="#f59e0b" name="Pending" />
                    </BarChart>
                </ChartPanel>

                {/* Department Performance Index */}
                <ChartPanel title="Department Performance Index (%)">
                    <BarChart data={deptPerformanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip
                            formatter={(value) => [`${value}%`, 'Completion Rate']}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                        />
                        <Bar dataKey="Performance" fill="#8b5cf6" name="Completion %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartPanel>
            </div>
        </div>
    );
};

export default CFODashboard;
