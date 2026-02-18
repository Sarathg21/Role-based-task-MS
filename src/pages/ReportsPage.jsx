import { useState, useMemo } from 'react';
import { TASKS, USERS, DEPARTMENTS } from '../data/mockData';
import { getEmployeeRankings } from '../utils/rankingEngine';
import ChartPanel from '../components/Charts/ChartPanel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Filter } from 'lucide-react'; // Assuming lucide-react is available

const ReportsPage = () => {
    const [filters, setFilters] = useState({
        employeeId: '',
        month: '',
        year: new Date().getFullYear().toString()
    });

    const { deptScores, topList, performanceData } = useMemo(() => {
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

        // Detailed Performance Data
        let filteredTasks = TASKS;

        if (filters.employeeId) {
            filteredTasks = filteredTasks.filter(t => t.employeeId === filters.employeeId);
        }

        if (filters.month) {
            filteredTasks = filteredTasks.filter(t => {
                const date = new Date(t.assignedDate);
                return date.getMonth() === parseInt(filters.month); // Month is 0-indexed
            });
        }

        if (filters.year) {
            filteredTasks = filteredTasks.filter(t => {
                const date = new Date(t.assignedDate);
                // Handle date parsing safely or assuming standard format YYYY-MM-DD
                return date.getFullYear().toString() === filters.year;
            });
        }

        // Aggregate by Employee for the table
        // Should list ALL employees matching the filter, or if specific employee selected, just that one.
        // If no filters, list all employees with their metrics.
        let reportEmployees = allEmployees;
        if (filters.employeeId) {
            reportEmployees = allEmployees.filter(u => u.id === filters.employeeId);
        }

        const reportData = reportEmployees.map(emp => {
            const empTasks = filteredTasks.filter(t => t.employeeId === emp.id);
            const total = empTasks.length;
            const completed = empTasks.filter(t => t.status === 'Completed').length;
            const pending = total - completed;
            const onTime = empTasks.filter(t => t.status === 'Completed' && t.completedDate <= t.dueDate).length;
            const onTimePct = completed > 0 ? Math.round((onTime / completed) * 100) : 0;
            const reworks = empTasks.reduce((sum, t) => sum + (t.reworkCount || 0), 0);
            const avgReworks = total > 0 ? (reworks / total).toFixed(1) : 0;

            return {
                id: emp.id,
                name: emp.name,
                department: emp.department,
                total,
                completed,
                pending,
                onTimePct,
                avgReworks
            };
        }).filter(row => row.total > 0 || !filters.month); // Optional: hide rows with no tasks if filtering by specific month? Or show zeros. Let's show all.

        return {
            deptScores: deptPerformance,
            topList: ranking.slice(0, 10),
            performanceData: reportData
        };
    }, [filters]);

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Employee Performance Report', 14, 22);

        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        if (filters.year) doc.text(`Year: ${filters.year}`, 80, 30);
        if (filters.month) doc.text(`Month: ${new Date(0, filters.month).toLocaleString('default', { month: 'long' })}`, 120, 30);

        const tableColumn = ["Employee", "Department", "Total Tasks", "Completed", "Pending", "On-Time %", "Avg Reworks"];
        const tableRows = [];

        performanceData.forEach(row => {
            const rowData = [
                row.name,
                row.department,
                row.total,
                row.completed,
                row.pending,
                `${row.onTimePct}%`,
                row.avgReworks
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] } // Violet color
        });

        doc.save('performance_report.pdf');
    };

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

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Detailed Performance Report</h3>
                        <p className="text-sm text-slate-500">Filter and download performance metrics</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <select
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                            value={filters.employeeId}
                            onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                        >
                            <option value="">All Employees</option>
                            {USERS.filter(u => u.role === 'Employee').map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                        <select
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                            value={filters.month}
                            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                        >
                            <option value="">All Months</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                        >
                            <option value="">All Years</option>
                            {[2023, 2024, 2025, 2026].map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
                        >
                            <Download size={16} /> Export PDF
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">Employee</th>
                                <th className="p-4">Total Tasks</th>
                                <th className="p-4">Completed</th>
                                <th className="p-4">Pending</th>
                                <th className="p-4">On-Time %</th>
                                <th className="p-4">Avg Reworks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                            {performanceData.length > 0 ? (
                                performanceData.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-medium">
                                            <div>{row.name}</div>
                                            <div className="text-xs text-slate-500">{row.department}</div>
                                        </td>
                                        <td className="p-4">{row.total}</td>
                                        <td className="p-4 text-green-600 font-medium">{row.completed}</td>
                                        <td className="p-4 text-orange-500">{row.pending}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${row.onTimePct >= 80 ? 'bg-green-500' : row.onTimePct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${row.onTimePct}%` }}
                                                    ></div>
                                                </div>
                                                <span>{row.onTimePct}%</span>
                                            </div>
                                        </td>
                                        <td className="p-4">{row.avgReworks}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        No performance data found for the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartPanel title="Department Performance Index">
                    <BarChart data={deptScores}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Performance" fill="#8b5cf6" name="Completion Rate %" />
                    </BarChart>
                </ChartPanel>

                <ChartPanel title="Monthly Trend by Department">
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Engineering" stroke="#8b5cf6" strokeWidth={2} />
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
