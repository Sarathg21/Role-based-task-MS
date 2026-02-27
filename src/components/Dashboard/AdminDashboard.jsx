import { useState, useMemo } from 'react';
import { TASKS, USERS, DEPARTMENTS } from '../../data/mockData';
import { getEmployeeRankings, getManagerRankings } from '../../utils/rankingEngine';
import StatsCard from '../UI/StatsCard';
import ChartPanel from '../Charts/ChartPanel';
import { Users, Briefcase, Activity, Award, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const AdminDashboard = () => {
    const [filters, setFilters] = useState({
        department: 'All',
        role: 'All',
        dateFrom: '',
        dateTo: '',
        performanceMin: '',
        performanceMax: ''
    });

    const { stats, deptData, topEmployees, orgTableData, managerRankings, deptPerformanceChart, workloadData, trendData } = useMemo(() => {
        const totalEmployees = USERS.filter(u => u.role === 'Employee').length;
        const totalManagers = USERS.filter(u => u.role === 'Manager').length;
        const activeTasks = TASKS.filter(t => t.status !== 'APPROVED').length;

        // Department Breakdown (headcount)
        const deptCounts = DEPARTMENTS.filter(d => USERS.some(u => u.department === d)).map(dept => ({
            name: dept,
            value: USERS.filter(u => u.department === dept).length
        }));

        const allEmployees = USERS.filter(u => u.role === 'Employee');
        const allManagers = USERS.filter(u => u.role === 'Manager');
        const rankedEmployees = getEmployeeRankings(allEmployees, TASKS);
        const rankedManagers = getManagerRankings(allManagers, TASKS, allEmployees);

        // Org table: Dept → Manager → Employees with scores
        const orgData = DEPARTMENTS.filter(d => USERS.some(u => u.department === d)).map(dept => {
            const mgr = allManagers.find(m => m.department === dept);
            const emps = allEmployees.filter(e => e.department === dept);
            const empWithScores = emps.map(e => {
                const found = rankedEmployees.find(r => r.id === e.id);
                return { ...e, score: found?.score ?? 0 };
            });
            const mgrScore = mgr ? (rankedManagers.find(r => r.id === mgr.id)?.score ?? 0) : 0;
            return {
                department: dept,
                manager: mgr,
                managerScore: mgrScore,
                employees: empWithScores
            };
        });

        // Department Performance (completion %)
        const deptPerf = DEPARTMENTS.filter(d => USERS.some(u => u.department === d)).map(dept => {
            const deptUserIds = USERS.filter(u => u.department === dept).map(u => u.id);
            const deptTasks = TASKS.filter(t => deptUserIds.includes(t.employeeId));
            const completed = deptTasks.filter(t => t.status === 'APPROVED').length;
            const total = deptTasks.length;
            const score = total > 0 ? Math.round((completed / total) * 100) : 0;
            return { name: dept, Performance: score, Tasks: total };
        });

        // Manager performance chart
        const mgrChartData = rankedManagers.map(m => ({ name: m.name.split(' ')[0], score: m.score, department: m.department }));

        // Workload distribution (tasks per department)
        const workload = DEPARTMENTS.filter(d => USERS.some(u => u.department === d)).map(dept => {
            const deptUserIds = USERS.filter(u => u.department === dept).map(u => u.id);
            const total = TASKS.filter(t => deptUserIds.includes(t.employeeId)).length;
            const pending = TASKS.filter(t => deptUserIds.includes(t.employeeId) && t.status !== 'APPROVED').length;
            return { name: dept, Total: total, Pending: pending, Completed: total - pending };
        });

        const trend = [
            { name: 'Jan', Engineering: 70, Sales: 65, HR: 80, Administration: 75 },
            { name: 'Feb', Engineering: 75, Sales: 68, HR: 78, Administration: 72 },
            { name: 'Mar', Engineering: 72, Sales: 75, HR: 82, Administration: 78 },
            { name: 'Apr', Engineering: 85, Sales: 80, HR: 85, Administration: 80 },
            { name: 'May', Engineering: 82, Sales: 85, HR: 88, Administration: 85 },
            { name: 'Jun', Engineering: 88, Sales: 90, HR: 90, Administration: 88 },
        ];

        const totalDepts = DEPARTMENTS.filter(d => USERS.some(u => u.department === d)).length;
        return {
            stats: { employees: totalEmployees, managers: totalManagers, activeTasks, departments: totalDepts },
            deptData: deptCounts,
            topEmployees: rankedEmployees.slice(0, 5),
            orgTableData: orgData,
            managerRankings: rankedManagers,
            deptPerformanceChart: deptPerf,
            workloadData: workload,
            trendData: trend
        };
    }, []);

    // Apply filters to org table
    const filteredOrgData = useMemo(() => {
        let data = [...orgTableData];
        if (filters.department !== 'All') {
            data = data.filter(r => r.department === filters.department);
        }
        if (filters.role === 'Manager') {
            data = data.map(r => ({ ...r, employees: [] }));
        } else if (filters.role === 'Employee') {
            data = data.map(r => ({ ...r, manager: null }));
        }
        if (filters.performanceMin !== '') {
            const min = parseFloat(filters.performanceMin);
            data = data.map(r => ({
                ...r,
                manager: r.manager && r.managerScore >= min ? r.manager : null,
                employees: r.employees.filter(e => e.score >= min)
            }));
        }
        if (filters.performanceMax !== '') {
            const max = parseFloat(filters.performanceMax);
            data = data.map(r => ({
                ...r,
                manager: r.manager && r.managerScore <= max ? r.manager : null,
                employees: r.employees.filter(e => e.score <= max)
            }));
        }
        return data;
    }, [orgTableData, filters]);

    const COLORS = ['#8b5cf6', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="space-y-4">
            {/* Stats Row - Compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatsCard title="Employees" value={stats.employees} icon={Users} color="primary" compact />
                <StatsCard title="Managers" value={stats.managers} icon={Briefcase} color="info" compact />
                <StatsCard title="Departments" value={stats.departments} icon={Building2} color="primary" compact />
                <StatsCard title="Active Tasks" value={stats.activeTasks} icon={Activity} color="warning" compact />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                <h3 className="text-xs font-medium text-slate-600 mb-2">Filters</h3>
                <div className="flex flex-wrap gap-2">
                    <select
                        className="px-2 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={filters.department}
                        onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    >
                        <option value="All">All Departments</option>
                        {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <select
                        className="px-2 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={filters.role}
                        onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    >
                        <option value="All">All Roles</option>
                        <option value="Manager">Managers Only</option>
                        <option value="Employee">Employees Only</option>
                    </select>
                    <input
                        type="date"
                        className="px-2 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="From"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    />
                    <input
                        type="date"
                        className="px-2 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="To"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    />
                    <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Min"
                        className="px-2 py-1.5 rounded-md border border-slate-200 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={filters.performanceMin}
                        onChange={(e) => setFilters({ ...filters, performanceMin: e.target.value })}
                    />
                    <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Max"
                        className="px-2 py-1.5 rounded-md border border-slate-200 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={filters.performanceMax}
                        onChange={(e) => setFilters({ ...filters, performanceMax: e.target.value })}
                    />
                </div>
            </div>

            {/* Tabular View: Organization */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200">
                    <h3 className="text-sm font-medium text-slate-800 flex items-center gap-2">
                        <Building2 size={16} /> Organization View
                    </h3>
                </div>
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="py-2 px-2 text-[10px] uppercase text-slate-500 font-medium">Dept</th>
                                <th className="py-2 px-2 text-[10px] uppercase text-slate-500 font-medium">Role</th>
                                <th className="py-2 px-2 text-[10px] uppercase text-slate-500 font-medium">Name</th>
                                <th className="py-2 px-2 text-[10px] uppercase text-slate-500 font-medium">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrgData.flatMap((row) => {
                                const rows = [];
                                if (row.manager && (filters.role === 'All' || filters.role === 'Manager')) {
                                    rows.push(
                                        <tr key={`${row.department}-mgr`} className="hover:bg-slate-50">
                                            <td className="py-1.5 px-2 font-medium text-slate-800">{row.department}</td>
                                            <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px]">Mgr</span></td>
                                            <td className="py-1.5 px-2">{row.manager.name}</td>
                                            <td className="py-1.5 px-2 text-violet-600">{row.managerScore}</td>
                                        </tr>
                                    );
                                }
                                if (filters.role === 'All' || filters.role === 'Employee') {
                                    row.employees.forEach((emp) =>
                                        rows.push(
                                            <tr key={emp.id} className="hover:bg-slate-50">
                                                <td className="py-1.5 px-2 text-slate-600">{row.department}</td>
                                                <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">Emp</span></td>
                                                <td className="py-1.5 px-2 pl-4">{emp.name}</td>
                                                <td className="py-1.5 px-2 text-violet-600">{emp.score}</td>
                                            </tr>
                                        )
                                    );
                                }
                                return rows;
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <ChartPanel title="Department-wise Performance Comparison">
                    <BarChart data={deptPerformanceChart}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="Performance" fill="#8b5cf6" name="Completion %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartPanel>

                <ChartPanel title="Manager Performance Comparison">
                    <BarChart data={managerRankings.map(m => ({ name: m.name.split(' ')[0], score: m.score, dept: m.department }))} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" width={80} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="score" fill="#10b981" name="Score" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ChartPanel>

                <ChartPanel title="Employee Distribution by Dept">
                    <PieChart>
                        <Pie data={deptData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" label>
                            {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ChartPanel>

                <ChartPanel title="Workload Distribution">
                    <BarChart data={workloadData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Completed" stackId="a" fill="#10b981" name="Completed" />
                        <Bar dataKey="Pending" stackId="a" fill="#f59e0b" name="Pending" />
                    </BarChart>
                </ChartPanel>

                <div className="lg:col-span-2">
                    <ChartPanel title="Performance Trend by Department">
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="Engineering" stroke="#8b5cf6" strokeWidth={2} />
                            <Line type="monotone" dataKey="Sales" stroke="#f59e0b" strokeWidth={2} />
                            <Line type="monotone" dataKey="HR" stroke="#10b981" strokeWidth={2} />
                            <Line type="monotone" dataKey="Administration" stroke="#6366f1" strokeWidth={2} />
                        </LineChart>
                    </ChartPanel>
                </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
                    <Award className="text-yellow-500" /> Top Performers
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {topEmployees.map((emp, index) => (
                        <div key={emp.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs shrink-0">
                                    {index + 1}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-slate-800 truncate">{emp.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{emp.department}</p>
                                </div>
                            </div>
                            <div className="text-violet-600 text-sm font-medium shrink-0">{emp.score}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
