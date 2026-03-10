import re

# Now fix AdminDashboard - update it to match CFO premium style
admin_path = r'c:\Users\SARATH\Project UAE\Rolebased task MS\src\components\Dashboard\AdminDashboard.jsx'

with open(admin_path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

print("AdminDashboard size:", len(content))

# New AdminDashboard content with CFO style
new_content = '''import { useState, useMemo } from 'react';
import { TASKS, USERS, DEPARTMENTS } from '../../data/mockData';
import { getEmployeeRankings, getManagerRankings } from '../../utils/rankingEngine';
import StatsCard from '../UI/StatsCard';
import ChartPanel from '../Charts/ChartPanel';
import { Users, Briefcase, Activity, Award, Building2, Shield } from 'lucide-react';
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

        const deptCounts = DEPARTMENTS.filter(d => USERS.some(u => u.department === d)).map(dept => ({
            name: dept,
            value: USERS.filter(u => u.department === dept).length
        }));

        const allEmployees = USERS.filter(u => u.role === 'Employee');
        const allManagers = USERS.filter(u => u.role === 'Manager');
        const rankedEmployees = getEmployeeRankings(allEmployees, TASKS);
        const rankedManagers = getManagerRankings(allManagers, TASKS, allEmployees);

        const orgData = DEPARTMENTS.filter(d => USERS.some(u => u.department === d)).map(dept => {
            const mgr = allManagers.find(m => m.department === dept);
            const emps = allEmployees.filter(e => e.department === dept);
            const empWithScores = emps.map(e => {
                const found = rankedEmployees.find(r => r.id === e.id);
                return { ...e, score: found?.score ?? 0 };
            });
            const mgrScore = mgr ? (rankedManagers.find(r => r.id === mgr.id)?.score ?? 0) : 0;
            return { department: dept, manager: mgr, managerScore: mgrScore, employees: empWithScores };
        });

        const deptPerf = DEPARTMENTS.filter(d => USERS.some(u => u.department === d)).map(dept => {
            const deptUserIds = USERS.filter(u => u.department === dept).map(u => u.id);
            const deptTasks = TASKS.filter(t => deptUserIds.includes(t.employeeId));
            const completed = deptTasks.filter(t => t.status === 'APPROVED').length;
            const total = deptTasks.length;
            const score = total > 0 ? Math.round((completed / total) * 100) : 0;
            return { name: dept, Performance: score, Tasks: total };
        });

        const mgrChartData = rankedManagers.map(m => ({ name: m.name.split(' ')[0], score: m.score, department: m.department }));

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

    const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header Hero - CFO Style */}
            <div className="rounded-[2rem] bg-white shadow-sm border border-slate-100 relative overflow-hidden p-6">
                <div className="absolute top-0 right-0 w-72 h-72 bg-violet-50 rounded-full blur-3xl -mr-36 -mt-36 opacity-60" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-50 rounded-full blur-3xl -ml-28 -mb-28 opacity-60" />
                <div className="relative z-10 flex items-center gap-5">
                    <div className="bg-slate-900 p-4 rounded-2xl shadow-xl">
                        <Shield size={28} className="text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                            Admin <span className="text-violet-600">Dashboard</span>
                        </h2>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">
                            Organization Overview &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Row - CFO gradient cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-300/40 py-5 px-6 transition-all duration-500 hover:scale-[1.03]">
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-violet-400/30 blur-2xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                            <Users size={22} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none">{stats.employees}</div>
                            <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-1">Employees</div>
                        </div>
                    </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-300/40 py-5 px-6 transition-all duration-500 hover:scale-[1.03]">
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-400/30 blur-2xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                            <Briefcase size={22} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none">{stats.managers}</div>
                            <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-1">Managers</div>
                        </div>
                    </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-300/40 py-5 px-6 transition-all duration-500 hover:scale-[1.03]">
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-400/30 blur-2xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                            <Building2 size={22} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none">{stats.departments}</div>
                            <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-1">Departments</div>
                        </div>
                    </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-300/40 py-5 px-6 transition-all duration-500 hover:scale-[1.03]">
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-amber-400/30 blur-2xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                            <Activity size={22} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none">{stats.activeTasks}</div>
                            <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-1">Active Tasks</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <Building2 size={13} className="text-violet-500" /> Filters
                </h3>
                <div className="flex flex-wrap gap-3">
                    <select
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-300 bg-slate-50 transition-all"
                        value={filters.department}
                        onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    >
                        <option key="all" value="All">All Departments</option>
                        {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <select
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 transition-all"
                        value={filters.role}
                        onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    >
                        <option key="all" value="All">All Roles</option>
                        <option key="mgr" value="Manager">Managers Only</option>
                        <option key="emp" value="Employee">Employees Only</option>
                    </select>
                    <input
                        type="date"
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 transition-all"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    />
                    <input
                        type="date"
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 transition-all"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    />
                    <input type="number" min="0" max="100" placeholder="Min Score"
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 w-28 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 transition-all"
                        value={filters.performanceMin}
                        onChange={(e) => setFilters({ ...filters, performanceMin: e.target.value })}
                    />
                    <input type="number" min="0" max="100" placeholder="Max Score"
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 w-28 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 transition-all"
                        value={filters.performanceMax}
                        onChange={(e) => setFilters({ ...filters, performanceMax: e.target.value })}
                    />
                </div>
            </div>

            {/* Organization View Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center gap-3">
                    <div className="bg-violet-100 text-violet-600 p-2 rounded-xl">
                        <Building2 size={18} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Organization View</h3>
                </div>
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 text-[10px] uppercase font-black tracking-[0.15em] text-slate-500 border-b border-slate-100 sticky top-0">
                            <tr>
                                <th className="py-3 px-5">Department</th>
                                <th className="py-3 px-5">Role</th>
                                <th className="py-3 px-5">Name</th>
                                <th className="py-3 px-5">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredOrgData.flatMap((row) => {
                                const rows = [];
                                if (row.manager && (filters.role === 'All' || filters.role === 'Manager')) {
                                    rows.push(
                                        <tr key={`${row.department}-mgr`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="py-2.5 px-5 font-black text-slate-800 text-[11px]">{row.department}</td>
                                            <td className="py-2.5 px-5"><span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px] font-black uppercase tracking-widest">Manager</span></td>
                                            <td className="py-2.5 px-5 font-medium text-slate-700">{row.manager.name}</td>
                                            <td className="py-2.5 px-5 font-black text-violet-600">{row.managerScore}</td>
                                        </tr>
                                    );
                                }
                                if (filters.role === 'All' || filters.role === 'Employee') {
                                    row.employees.forEach((emp) =>
                                        rows.push(
                                            <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-2.5 px-5 text-slate-500 text-[11px]">{row.department}</td>
                                                <td className="py-2.5 px-5"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest">Emp</span></td>
                                                <td className="py-2.5 px-5 pl-8 text-slate-700">{emp.name}</td>
                                                <td className="py-2.5 px-5 font-black text-violet-600">{emp.score}</td>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartPanel title="Department-wise Performance Comparison">
                    <BarChart data={deptPerformanceChart}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="Performance" fill="#8b5cf6" name="Completion %" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ChartPanel>

                <ChartPanel title="Manager Performance Comparison">
                    <BarChart data={managerRankings.map(m => ({ name: m.name.split(' ')[0], score: m.score, dept: m.department }))} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="score" fill="#10b981" name="Score" radius={[0, 6, 6, 0]} barSize={20} />
                    </BarChart>
                </ChartPanel>

                <ChartPanel title="Employee Distribution by Dept">
                    <PieChart>
                        <Pie data={deptData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={4}>
                            {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: '700' }} />
                    </PieChart>
                </ChartPanel>

                <ChartPanel title="Workload Distribution">
                    <BarChart data={workloadData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: '700' }} />
                        <Bar dataKey="Completed" stackId="a" fill="#10b981" name="Completed" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Pending" stackId="a" fill="#f59e0b" name="Pending" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ChartPanel>

                <div className="lg:col-span-2">
                    <ChartPanel title="Performance Trend by Department">
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: '700' }} />
                            <Line type="monotone" dataKey="Engineering" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="Sales" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="HR" stroke="#10b981" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="Administration" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                        </LineChart>
                    </ChartPanel>
                </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="bg-amber-100 text-amber-600 p-2 rounded-xl">
                        <Award size={18} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Top Performers</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {topEmployees.map((emp, index) => (
                        <div key={emp.id} className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-violet-50 rounded-xl border border-slate-100 hover:border-violet-200 transition-all">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>
                                    {index + 1}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-800 truncate">{emp.name}</p>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold truncate">{emp.department}</p>
                                </div>
                            </div>
                            <div className="text-violet-600 text-sm font-black shrink-0 ml-2">{emp.score}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
'''

with open(admin_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("AdminDashboard written successfully. Size:", len(new_content))
print("Done!")
