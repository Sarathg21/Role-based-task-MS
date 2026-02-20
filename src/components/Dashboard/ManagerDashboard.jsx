import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TASKS, USERS } from '../../data/mockData';
import { calculateManagerScore } from '../../utils/performanceEngine';
import Badge from '../UI/Badge';
import {
    BarChart2, CheckSquare, AlertTriangle, Clock, ArrowRight,
    Calendar, Users, TrendingUp, Medal, CalendarCheck, CheckCircle
} from 'lucide-react';


/* ─── Small stat card ──────────────────────────────────────── */
const Stat = ({ label, value, sub, icon: Icon, color = 'violet' }) => {
    const colors = {
        violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'bg-violet-100' },
        green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'bg-green-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'bg-amber-100' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'bg-orange-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'bg-blue-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'bg-rose-100' },
    };
    const c = colors[color] || colors.violet;
    return (
        <div className={`${c.bg} rounded-2xl p-4 flex items-center gap-4`}>
            <div className={`${c.icon} p-3 rounded-xl`}>
                <Icon size={20} className={c.text} />
            </div>
            <div>
                <div className={`text-2xl font-extrabold ${c.text}`}>{value}</div>
                <div className="text-xs font-semibold text-slate-500 leading-tight">{label}</div>
                {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
            </div>
        </div>
    );
};

const ManagerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    /* ── Date range filter state ─── */
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    /* ── Derived data ──────────────── */
    const { stats, rankedTeam, todayTeamTasks } = useMemo(() => {
        const myTeam = USERS.filter(u => u.managerId === user.id);
        const teamIds = myTeam.map(u => u.id);

        /* Apply date range filter */
        let teamTasks = TASKS.filter(t => teamIds.includes(t.employeeId));
        if (fromDate) teamTasks = teamTasks.filter(t => t.assignedDate >= fromDate);
        if (toDate) teamTasks = teamTasks.filter(t => t.assignedDate <= toDate);

        const score = calculateManagerScore(TASKS, user.id, teamIds);
        const completed = teamTasks.filter(t => ['Completed', 'APPROVED'].includes(t.status)).length;
        const pending = teamTasks.filter(t => !['Completed', 'APPROVED', 'CANCELLED'].includes(t.status)).length;
        const totalReworks = teamTasks.reduce((s, t) => s + (t.reworkCount || 0), 0);
        const completionRate = teamTasks.length > 0 ? Math.round((completed / teamTasks.length) * 100) : 0;

        /* Build ranking table: tasks assigned & completed per employee */
        const ranked = myTeam.map(emp => {
            const empTasks = teamTasks.filter(t => t.employeeId === emp.id);
            const empDone = empTasks.filter(t => ['Completed', 'APPROVED'].includes(t.status)).length;
            return { ...emp, assigned: empTasks.length, completed: empDone };
        }).sort((a, b) => b.completed - a.completed || b.assigned - a.assigned)
            .map((emp, idx) => ({ ...emp, rank: idx + 1 }));

        /* Today's tasks for the team — not affected by date range filter */
        const todayStr = new Date().toISOString().split('T')[0];
        const todayTeamTasks = TASKS.filter(t =>
            teamIds.includes(t.employeeId) &&
            t.dueDate === todayStr &&
            !['Completed', 'APPROVED', 'CANCELLED'].includes(t.status)
        ).sort((a, b) => (a.severity === 'High' ? -1 : 1));

        return {
            stats: { score, completionRate, totalReworks, pending, total: teamTasks.length },
            rankedTeam: ranked,
            todayTeamTasks,
        };
    }, [user.id, fromDate, toDate]);

    const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="space-y-6">

            {/* ══ TODAY'S TASKS HERO ══ */}
            <div
                className="rounded-2xl overflow-hidden shadow-xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 40%, #a78bfa 80%, #c4b5fd 100%)' }}
            >
                <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/30 backdrop-blur-sm p-2.5 rounded-xl">
                            <CalendarCheck size={22} className="text-white drop-shadow" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-sm">Team's Tasks Today</h2>
                            <p className="text-violet-200 text-xs mt-0.5">{dateLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-center bg-white/25 backdrop-blur rounded-xl px-5 py-2">
                            <div className="text-3xl font-black text-white">{todayTeamTasks.length}</div>
                            <div className="text-violet-200 text-[10px] uppercase tracking-widest font-semibold">Due Today</div>
                        </div>
                        <button
                            onClick={() => navigate('/tasks')}
                            className="flex items-center gap-2 bg-white text-violet-700 hover:bg-violet-50 hover:scale-105 transition-all text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg"
                        >
                            View All <ArrowRight size={15} />
                        </button>
                    </div>
                </div>

                <div className="mx-6 border-t border-white/30" />

                <div className="p-5">
                    {todayTeamTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 bg-white/20 backdrop-blur rounded-2xl">
                            <CheckCircle size={38} className="text-white drop-shadow" />
                            <p className="text-white font-bold text-lg drop-shadow-sm">Team is on track! 🎉</p>
                            <p className="text-violet-200 text-sm">No team tasks due today.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {todayTeamTasks.map(task => {
                                const assignee = USERS.find(u => u.id === task.employeeId);
                                const sevColor =
                                    task.severity === 'High' ? { pill: 'bg-red-500 text-white', border: 'border-l-red-400' } :
                                        task.severity === 'Medium' ? { pill: 'bg-amber-500 text-white', border: 'border-l-amber-400' } :
                                            { pill: 'bg-emerald-500 text-white', border: 'border-l-emerald-400' };
                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => navigate('/tasks')}
                                        className={`bg-white rounded-xl p-4 shadow-lg cursor-pointer hover:scale-[1.03] hover:shadow-xl transition-all border-l-4 ${sevColor.border}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${sevColor.pill}`}>
                                                {task.severity}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-semibold">{task.id}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm leading-snug mb-0.5 truncate">{task.title}</h4>
                                        <p className="text-slate-400 text-xs mb-2 truncate">{task.description}</p>
                                        <div className="text-[10px] text-slate-500 font-medium">
                                            Assigned to: <span className="font-semibold text-slate-700">{assignee?.name || task.employeeId}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Manager Dashboard</h2>
                        <p className="text-sm text-slate-500 mt-0.5">{user.department} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>

                    {/* Date range */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-xs text-slate-500 font-medium">From</span>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">To</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                            />
                        </div>
                        {(fromDate || toDate) && (
                            <button
                                onClick={() => { setFromDate(''); setToDate(''); }}
                                className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ STATS GRID ══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat
                    label="Team Score"
                    value={stats.score}
                    sub="Overall performance"
                    icon={BarChart2}
                    color="violet"
                />
                <Stat
                    label="Completion Rate"
                    value={`${stats.completionRate}%`}
                    sub={`${stats.total} total tasks`}
                    icon={TrendingUp}
                    color="green"
                />
                <Stat
                    label="Total Reworks"
                    value={stats.totalReworks}
                    sub="Corrections requested"
                    icon={AlertTriangle}
                    color="amber"
                />
                <Stat
                    label="Pending"
                    value={stats.pending}
                    sub="Active tasks"
                    icon={Clock}
                    color="orange"
                />
            </div>

            {/* ══ VIEW ALL TEAM TASKS BUTTON ══ */}
            <div className="flex justify-end">
                <button
                    onClick={() => navigate('/tasks')}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                    View All Team Tasks <ArrowRight size={16} />
                </button>
            </div>

            {/* ══ TEAM PERFORMANCE RANKING TABLE ══ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                    <Medal size={18} className="text-amber-500" />
                    <h3 className="text-base font-semibold text-slate-800">Team Performance Ranking</h3>
                    <span className="ml-auto text-xs text-slate-400 font-medium">{user.department}</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                            <tr>
                                <th className="py-3 px-5">Rank</th>
                                <th className="py-3 px-5">Employee</th>
                                <th className="py-3 px-5">Role</th>
                                <th className="py-3 px-5 text-center">Tasks Assigned</th>
                                <th className="py-3 px-5 text-center">Tasks Completed</th>
                                <th className="py-3 px-5 text-center">Rate</th>
                                <th className="py-3 px-5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {rankedTeam.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="py-8 text-center text-slate-400">
                                        No team members found.
                                    </td>
                                </tr>
                            )}
                            {rankedTeam.map(member => {
                                const rate = member.assigned > 0
                                    ? Math.round((member.completed / member.assigned) * 100)
                                    : 0;
                                return (
                                    <tr key={member.id} className="hover:bg-slate-50">
                                        <td className="py-3 px-5">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${member.rank === 1 ? 'bg-amber-100 text-amber-700' :
                                                member.rank === 2 ? 'bg-slate-200 text-slate-600' :
                                                    member.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>
                                                #{member.rank}
                                            </span>
                                        </td>
                                        <td className="py-3 px-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <span className="font-medium truncate">{member.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-5 text-slate-500">{member.role}</td>
                                        <td className="py-3 px-5 text-center font-semibold text-slate-700">{member.assigned}</td>
                                        <td className="py-3 px-5 text-center font-semibold text-green-700">{member.completed}</td>
                                        <td className="py-3 px-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-violet-500"
                                                        style={{ width: `${rate}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600">{rate}%</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-5">
                                            <Badge variant={rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'danger'}>
                                                {rate >= 80 ? 'Excellent' : rate >= 50 ? 'Average' : 'Needs Help'}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default ManagerDashboard;
