import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TASKS } from '../../data/mockData';
import { calculateEmployeeScore } from '../../utils/performanceEngine';
import StatsCard from '../UI/StatsCard';
import TaskTable from '../UI/TaskTable';
import ChartPanel from '../Charts/ChartPanel';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const EmployeeDashboard = () => {
    const { user } = useAuth();

    // Memoize calculations
    const { stats, score, recentTasks, performanceData } = useMemo(() => {
        const myTasks = TASKS.filter(t => t.employeeId === user.id);
        const completed = myTasks.filter(t => t.status === 'Completed').length;
        const pending = myTasks.filter(t => t.status !== 'Completed').length;
        const total = myTasks.length;

        // Calculate Score
        const currentScore = calculateEmployeeScore(TASKS, user.id);

        // Sort by due date for recent/upcoming
        const sortedTasks = [...myTasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        // Mock trend data
        const data = [
            { name: 'Week 1', score: 65 },
            { name: 'Week 2', score: 72 },
            { name: 'Week 3', score: 78 },
            { name: 'Week 4', score: currentScore },
        ];

        return {
            stats: { completed, pending, total },
            score: currentScore,
            recentTasks: sortedTasks.slice(0, 5),
            performanceData: data
        };
    }, [user.id]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Performance Score"
                    value={score}
                    icon={TrendingUp}
                    color="primary"
                    trend="up"
                    trendValue="5.2%"
                />
                <StatsCard
                    title="Assigned Tasks"
                    value={stats.total}
                    icon={Clock}
                    color="info"
                />
                <StatsCard
                    title="Completed"
                    value={stats.completed}
                    icon={CheckCircle}
                    color="success"
                />
                <StatsCard
                    title="Pending"
                    value={stats.pending}
                    icon={AlertCircle}
                    color="warning"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">My Tasks</h3>
                            <button className="text-sm text-primary hover:underline">View All</button>
                        </div>
                        <TaskTable tasks={recentTasks} />
                    </div>
                </div>
                <div>
                    <ChartPanel title="Performance Trend">
                        <BarChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis domain={[0, 100]} fontSize={12} />
                            <Tooltip />
                            <Bar dataKey="score" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartPanel>

                    <div className="mt-6 bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-800 mb-2">Recommendation</h4>
                        <p className="text-sm text-indigo-700">
                            Your timeliness score is slightly low. Try to complete the "API Integration" task by Friday to improve your monthly rating.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
