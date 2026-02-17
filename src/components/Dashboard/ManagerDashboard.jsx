import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TASKS, USERS } from '../../data/mockData';
import { calculateManagerScore } from '../../utils/performanceEngine';
import { getEmployeeRankings } from '../../utils/rankingEngine';
import StatsCard from '../UI/StatsCard';
import ChartPanel from '../Charts/ChartPanel';
import Badge from '../UI/Badge';
import { Users, BarChart2, AlertTriangle, CheckSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

const ManagerDashboard = () => {
    const { user } = useAuth();

    const { stats, teamMembers, topPerformer } = useMemo(() => {
        // Find team members
        const myTeam = USERS.filter(u => u.managerId === user.id);
        const teamIds = myTeam.map(u => u.id);

        // Find team tasks
        const teamTasks = TASKS.filter(t => teamIds.includes(t.employeeId));

        // Calculate Manager Score
        const score = calculateManagerScore(TASKS, user.id, teamIds);

        // Calculate Team Ranks
        const rankedTeam = getEmployeeRankings(myTeam, TASKS);
        const bestEmp = rankedTeam[0];

        // Stats
        const completed = teamTasks.filter(t => t.status === 'Completed').length;
        const total = teamTasks.length;
        const rework = teamTasks.reduce((acc, t) => acc + (t.reworkCount || 0), 0);

        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            stats: { score, completionRate, rework, totalTasks: total },
            teamMembers: rankedTeam,
            topPerformer: bestEmp
        };
    }, [user.id]);

    const COLORS = ['#4f46e5', '#00C49F', '#FFBB28', '#FF8042'];
    const teamPerformanceData = teamMembers.map(m => ({ name: m.name, score: m.score }));

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Team Score" value={stats.score} icon={BarChart2} color="primary" />
                <StatsCard title="Completion Rate" value={`${stats.completionRate}%`} icon={CheckSquare} color="success" />
                <StatsCard title="Total Reworks" value={stats.rework} icon={AlertTriangle} color="warning" />
                <StatsCard title="Top Performer" value={topPerformer?.name || 'N/A'} icon={Users} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team Ranking Table */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Team Performance Rankings</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                                <tr>
                                    <th className="p-3">Rank</th>
                                    <th className="p-3">Employee</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Score</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {teamMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-slate-700">#{member.rank}</td>
                                        <td className="p-3 font-medium">{member.name}</td>
                                        <td className="p-3">{member.role}</td>
                                        <td className="p-3 font-bold text-primary">{member.score}</td>
                                        <td className="p-3">
                                            <Badge variant={member.score >= 80 ? 'success' : member.score >= 50 ? 'warning' : 'danger'}>
                                                {member.score >= 80 ? 'Excellent' : 'Average'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Chart */}
                <div className="flex flex-col gap-6">
                    <ChartPanel title="Score Distribution" height={250}>
                        <BarChart data={teamPerformanceData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                            <Tooltip />
                            <Bar dataKey="score" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ChartPanel>

                    {/* My Tasks Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">My Assigned Tasks</h3>
                        <div className="space-y-3">
                            {TASKS.filter(t => t.employeeId === user.id).slice(0, 3).map(task => (
                                <div key={task.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="font-medium text-sm truncate">{task.title}</div>
                                    <div className="flex justify-between items-center mt-2">
                                        <Badge variant={task.status}>{task.status.replace(/_/g, ' ')}</Badge>
                                        <span className="text-xs text-slate-500">{task.dueDate}</span>
                                    </div>
                                </div>
                            ))}
                            {TASKS.filter(t => t.employeeId === user.id).length === 0 && (
                                <p className="text-slate-500 text-sm">No tasks assigned to you.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
