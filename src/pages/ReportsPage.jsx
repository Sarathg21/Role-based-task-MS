import { useMemo } from 'react';
import { TASKS, USERS, DEPARTMENTS } from '../data/mockData';
import { getEmployeeRankings } from '../utils/rankingEngine';
import ChartPanel from '../components/Charts/ChartPanel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const ReportsPage = () => {
    const { deptScores, topList } = useMemo(() => {
        // Department Performance Analysis
        const deptPerformance = DEPARTMENTS.map(dept => {
            const deptUsers = USERS.filter(u => u.department === dept && u.role === 'Employee');
            const deptParams = deptUsers.map(u => ({
                id: u.id,
                tasks: TASKS.filter(t => t.employeeId === u.id)
            }));

            // Average completion rate
            let totalTasks = 0;
            let completedTasks = 0;

            deptParams.forEach(p => {
                totalTasks += p.tasks.length;
                completedTasks += p.tasks.filter(t => t.status === 'Completed').length;
            });

            const score = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            return {
                name: dept,
                Performance: Math.round(score),
                Tasks: totalTasks
            };
        });

        // Top 10 Employees
        const allEmployees = USERS.filter(u => u.role === 'Employee');
        const ranking = getEmployeeRankings(allEmployees, TASKS);

        return {
            deptScores: deptPerformance,
            topList: ranking.slice(0, 10)
        };
    }, []);

    const trendData = [
        { name: 'Jan', Sales: 65, Engineering: 70, HR: 80 },
        { name: 'Feb', Sales: 68, Engineering: 75, HR: 78 },
        { name: 'Mar', Sales: 75, Engineering: 72, HR: 82 },
        { name: 'Apr', Sales: 80, Engineering: 85, HR: 85 },
        { name: 'May', Sales: 85, Engineering: 82, HR: 88 },
        { name: 'Jun', Sales: 90, Engineering: 88, HR: 90 },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Analytics & Reports</h1>
                <p className="text-slate-500">System-wide performance metrics</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartPanel title="Department Performance Index">
                    <BarChart data={deptScores}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Performance" fill="#2563eb" name="Completion Rate %" />
                    </BarChart>
                </ChartPanel>

                <ChartPanel title="Monthly Trend by Department">
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Engineering" stroke="#2563eb" strokeWidth={2} />
                        <Line type="monotone" dataKey="Sales" stroke="#f59e0b" strokeWidth={2} />
                        <Line type="monotone" dataKey="HR" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                </ChartPanel>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">Top High Performers</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">Rank</th>
                                <th className="p-4">Employee</th>
                                <th className="p-4">Department</th>
                                <th className="p-4">Manager</th>
                                <th className="p-4">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                            {topList.map((emp, i) => (
                                <tr key={emp.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-600">#{i + 1}</td>
                                    <td className="p-4 font-medium">{emp.name}</td>
                                    <td className="p-4">{emp.department}</td>
                                    <td className="p-4 text-slate-500">{emp.managerId}</td>
                                    <td className="p-4 font-bold text-primary">{emp.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
