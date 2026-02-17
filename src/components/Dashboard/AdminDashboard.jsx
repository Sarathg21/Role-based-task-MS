import { useMemo } from 'react';
import { TASKS, USERS, DEPARTMENTS } from '../../data/mockData';
import { getEmployeeRankings, getManagerRankings } from '../../utils/rankingEngine';
import StatsCard from '../UI/StatsCard';
import ChartPanel from '../Charts/ChartPanel';
import { Users, Briefcase, Activity, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
    const { stats, deptData, topEmployees } = useMemo(() => {
        const totalEmployees = USERS.filter(u => u.role === 'Employee').length;
        const totalManagers = USERS.filter(u => u.role === 'Manager').length;
        const activeTasks = TASKS.filter(t => t.status !== 'Completed').length;

        // Department Breakdown
        const deptCounts = DEPARTMENTS.map(dept => ({
            name: dept,
            value: USERS.filter(u => u.department === dept).length
        }));

        // Top Performers Global
        const allEmployees = USERS.filter(u => u.role === 'Employee');
        const rankedEmployees = getEmployeeRankings(allEmployees, TASKS);

        return {
            stats: {
                employees: totalEmployees,
                managers: totalManagers,
                activeTasks
            },
            deptData: deptCounts,
            topEmployees: rankedEmployees.slice(0, 5)
        };
    }, []);

    const COLORS = ['#4f46e5', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard title="Total Employees" value={stats.employees} icon={Users} color="primary" />
                <StatsCard title="Total Managers" value={stats.managers} icon={Briefcase} color="info" />
                <StatsCard title="Active Tasks" value={stats.activeTasks} icon={Activity} color="warning" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartPanel title="Employee Distribution by Dept">
                    <PieChart>
                        <Pie
                            data={deptData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label
                        >
                            {deptData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ChartPanel>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Award className="text-yellow-500" /> Top Performers
                    </h3>
                    <div className="space-y-4">
                        {topEmployees.map((emp, index) => (
                            <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">{emp.name}</p>
                                        <p className="text-xs text-slate-500">{emp.department}</p>
                                    </div>
                                </div>
                                <div className="font-bold text-primary">{emp.score}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
