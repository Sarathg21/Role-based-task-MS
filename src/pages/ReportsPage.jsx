import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getEmployeeRankings } from '../utils/rankingEngine';
import ChartPanel from '../components/Charts/ChartPanel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileSpreadsheet, TrendingUp, TrendingDown } from 'lucide-react';

const ReportsPage = () => {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        employeeId: '',
        month: '',
        year: new Date().getFullYear().toString()
    });

    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            // Use role-appropriate dashboard endpoint
            const endpoint = (user?.role === 'CFO' || user?.role === 'Admin')
                ? '/dashboard/cfo'
                : '/dashboard/manager';
            const response = await api.get(endpoint);
            // Both endpoints return tasks stats; normalize to an array for the table
            const raw = response.data;
            // Build a flat array from department_stats (CFO) or manager_stats (Manager)
            const stats = raw.department_stats || raw.manager_stats || [];
            setReportData(stats);
        } catch (err) {
            console.error("Failed to fetch reports", err);
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [filters]);

    const { topList, performanceData, deptScores, topDept, underperformingDept, workloadData, empWorkloadData, empPerformanceData } = useMemo(() => {
        const empty = {
            topList: [], performanceData: [], deptScores: [],
            topDept: null, underperformingDept: null,
            workloadData: [], empWorkloadData: [], empPerformanceData: []
        };
        if (!reportData) return empty;

        const arr = Array.isArray(reportData) ? reportData : [];
        if (arr.length === 0) return empty;

        // department_stats shape: { department_id, total_tasks, approved_tasks, pending_tasks }
        // manager_stats shape: { emp_id, name, role, tasks_assigned, tasks_completed }
        const isDeptShape = ('department_id' in arr[0]);

        const mapped = isDeptShape
            ? arr.map(d => ({
                id: d.department_id,
                name: d.department_id,
                role: 'Department',
                department: d.department_id,
                total: d.total_tasks || 0,
                completed: d.approved_tasks || 0,
                pending: d.pending_tasks || 0,
                onTimePct: d.total_tasks > 0 ? Math.round((d.approved_tasks / d.total_tasks) * 100) : 0,
                avgReworks: 0,
            }))
            : arr.map(u => ({
                id: u.emp_id,
                name: u.name,
                role: u.role,
                department: u.department || '',
                total: u.tasks_assigned || 0,
                completed: u.tasks_completed || 0,
                pending: (u.tasks_assigned || 0) - (u.tasks_completed || 0),
                onTimePct: u.tasks_assigned > 0 ? Math.round((u.tasks_completed / u.tasks_assigned) * 100) : 0,
                avgReworks: 0,
            }));

        const sorted = [...mapped].sort((a, b) => b.onTimePct - a.onTimePct);

        return {
            performanceData: mapped,
            topList: sorted.slice(0, 5),
            deptScores: isDeptShape ? mapped.map(d => ({ name: d.name, Performance: d.onTimePct })) : [],
            topDept: isDeptShape && sorted[0] ? { name: sorted[0].name, Performance: sorted[0].onTimePct, Tasks: sorted[0].total } : null,
            underperformingDept: isDeptShape && sorted.length > 1 ? { name: sorted[sorted.length - 1].name, Performance: sorted[sorted.length - 1].onTimePct, Tasks: sorted[sorted.length - 1].total } : null,
            workloadData: isDeptShape ? mapped.map(d => ({ name: d.name, Total: d.total, Completed: d.completed, Pending: d.pending })) : [],
            empWorkloadData: !isDeptShape ? mapped.map(u => ({ name: u.name, Completed: u.completed, Pending: u.pending })) : [],
            empPerformanceData: !isDeptShape ? mapped.map(u => ({ name: u.name, Performance: u.onTimePct })) : [],
        };
    }, [reportData]);


    const downloadFile = async (format) => {
        try {
            const params = new URLSearchParams({
                from_date: filters.year + '-01-01',
                to_date: filters.year + '-12-31'
            });
            if (filters.department_id) params.append('department_id', filters.department_id);
            if (filters.employeeId) params.append('employee_id', filters.employeeId);

            const url = `${api.defaults.baseURL}/reports/performance.${format}?${params.toString()}`;

            // Use JWT Bearer token (not legacy X-EMP-ID)
            const token = localStorage.getItem('pms_token');
            const response = await fetch(url, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `performance_report_${filters.year}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);

        } catch (err) {
            console.error(`Failed to download ${format}`, err);
            alert(`Failed to download ${format} report`);
        }
    };

    const handleDownloadPDF = () => downloadFile('pdf');
    const handleDownloadExcel = () => downloadFile('csv'); // Backend uses .csv for Excel button in mock, adjusting to .csv/xlsx

    const trendData = [
        { name: 'Jan', Sales: 65, Engineering: 70, HR: 80 },
        { name: 'Feb', Sales: 68, Engineering: 75, HR: 78 },
        { name: 'Mar', Sales: 75, Engineering: 72, HR: 82 },
        { name: 'Apr', Sales: 80, Engineering: 85, HR: 85 },
        { name: 'May', Sales: 85, Engineering: 82, HR: 88 },
        { name: 'Jun', Sales: 90, Engineering: 88, HR: 90 },
    ];

    if (loading && !reportData) {
        return <div className="p-8 text-center text-slate-500">Loading reports...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Analytics & Reports</h1>
                <p className="text-slate-500">{user?.role === 'Manager' ? 'Department performance metrics' : 'System-wide performance metrics'}</p>
            </div>

            {/* Top / Underperforming Departments & Workload (CFO & Admin) */}
            {(user?.role === 'Admin' || user?.role === 'CFO') && (topDept || underperformingDept) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topDept && (
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                            <div className="flex items-center gap-2 text-emerald-700">
                                <TrendingUp size={20} />
                                <span className="font-medium">Top Performing Department</span>
                            </div>
                            <p className="mt-2 text-xl font-semibold text-emerald-800">{topDept.name}</p>
                            <p className="text-sm text-emerald-600">{topDept.Performance}% completion · {topDept.Tasks} tasks</p>
                        </div>
                    )}
                    {underperformingDept && underperformingDept.name !== topDept?.name && (
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                            <div className="flex items-center gap-2 text-amber-700">
                                <TrendingDown size={20} />
                                <span className="font-medium">Needs Attention</span>
                            </div>
                            <p className="mt-2 text-xl font-semibold text-amber-800">{underperformingDept.name}</p>
                            <p className="text-sm text-amber-600">{underperformingDept.Performance}% completion · {underperformingDept.Tasks} tasks</p>
                        </div>
                    )}
                    {workloadData?.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <span className="font-medium text-slate-700">Workload Summary</span>
                            <div className="mt-2 space-y-1 text-sm">
                                {workloadData.map(d => (
                                    <div key={d.name} className="flex justify-between">
                                        <span>{d.name}</span>
                                        <span className="text-slate-600">{d.Total} tasks ({d.Pending} pending)</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-lg font-medium text-slate-800">Detailed Performance Report</h3>
                        <p className="text-sm text-slate-500">Filter and download performance metrics</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <select
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                            value={filters.employeeId}
                            onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                        >
                            <option value="">All Employees</option>
                            {reportData?.employees?.map(u => (
                                <option key={u.emp_id} value={u.emp_id}>{u.name}</option>
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
                        <button
                            onClick={handleDownloadExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                            <FileSpreadsheet size={16} /> Export Excel (CSV)
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
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
                                        <td className="p-4 truncate">
                                            <div className="truncate">{row.name}</div>
                                            <div className="text-xs text-slate-500">{row.department}</div>
                                        </td>
                                        <td className="p-4">{row.total}</td>
                                        <td className="p-4 text-green-600 truncate">{row.completed}</td>
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

                {/* ── Manager: employee-wise charts ── */}
                {user?.role === 'Manager' && (
                    <>
                        <ChartPanel title="Employee Workload Distribution">
                            <BarChart data={empWorkloadData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Completed" stackId="a" fill="#10b981" name="Completed" />
                                <Bar dataKey="Pending" stackId="a" fill="#f59e0b" name="Pending" />
                            </BarChart>
                        </ChartPanel>

                        <ChartPanel title="Employee Performance Index (%)">
                            <BarChart data={empPerformanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip formatter={v => [`${v}%`, 'Completion Rate']} />
                                <Bar dataKey="Performance" fill="#8b5cf6" name="Performance %" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartPanel>
                    </>
                )}

                {/* ── CFO / Admin: dept-wise charts ── */}
                {(user?.role === 'Admin' || user?.role === 'CFO') && (
                    <>
                        <ChartPanel title="Workload Distribution by Department">
                            <BarChart data={workloadData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Completed" stackId="a" fill="#10b981" name="Completed" />
                                <Bar dataKey="Pending" stackId="a" fill="#f59e0b" name="Pending" />
                            </BarChart>
                        </ChartPanel>

                        <ChartPanel title="Department Performance Index (%)">
                            <BarChart data={deptScores}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Performance" fill="#8b5cf6" name="Completion Rate %" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartPanel>
                    </>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-medium text-slate-800">Top High Performers</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
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
                                    <td className="p-4 text-slate-600 truncate">#{i + 1}</td>
                                    <td className="p-4 truncate">{emp.name}</td>
                                    <td className="p-4 truncate">{emp.department}</td>
                                    <td className="p-4 text-slate-500 truncate">{emp.managerId}</td>
                                    <td className="p-4 text-violet-600 truncate">{emp.score}</td>
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
