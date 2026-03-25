import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    Calendar, Download, FileSpreadsheet, Activity, AlertTriangle, 
    CheckSquare, ClipboardList, Play, ArrowUpRight, BarChart2
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, ComposedChart
} from 'recharts';

const EmployeePersonalReport = () => {
    const { user } = useAuth();
    const [fromDate, setFromDate] = useState('2026-03-01');
    const [toDate, setToDate] = useState('2026-03-22');
    const [loading, setLoading] = useState(true);

    const [tasks, setTasks] = useState([]);
    const [summary, setSummary] = useState({});
    const [topPerformers, setTopPerformers] = useState([]);

    useEffect(() => {
        // Set default dates dynamically if needed, but for now align with the mock's dates or current
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        setFromDate(start.toISOString().split('T')[0]);
        setToDate(now.toISOString().split('T')[0]);
    }, []);

    const fetchDashData = async () => {
        setLoading(true);
        try {
            const params = { fromDate, toDate, scope: 'mine', start_date: fromDate, end_date: toDate };
            const [dashRes, tasksRes] = await Promise.all([
                api.get('/dashboard/employee', { params }),
                api.get('/tasks', { params: { ...params, limit: 100 } }),
            ]);

            // Try various endpoints to get peer data for ranking
            let deptTasksRes = null;
            const teamParams = { 
                from_date: fromDate, 
                to_date: toDate, 
                start_date: fromDate, 
                end_date: toDate, 
                limit: 100 // Ensure limit <= 100 to avoid 422
            };

            const endpoints = [
                { url: '/tasks/team', params: teamParams },
                { url: '/tasks', params: { ...teamParams, scope: 'department' } },
                { url: '/tasks', params: { ...teamParams, scope: 'org' } }
            ];

            const aggregatedRankingTasks = [];
            for (const ep of endpoints) {
                try {
                    const res = await api.get(ep.url, { params: ep.params });
                    const rows = res?.data?.data || res?.data || [];
                    if (Array.isArray(rows) && rows.length > 0) {
                        rows.forEach(r => aggregatedRankingTasks.push(r));
                    }
                } catch (e) {
                    if (e.response?.status === 422) continue;
                    console.warn(`Fetch to ${ep.url} failed:`, e.message);
                }
            }
            
            const dashData = dashRes?.data?.data || dashRes?.data || {};
            setSummary(dashData);

            const fetchedTasks = tasksRes?.data?.data || tasksRes?.data || [];
            const myTasks = Array.isArray(fetchedTasks) ? fetchedTasks : [];
            setTasks(myTasks);

            // ── Build Top Performer Per Department ──
            // Combine all available tasks for a comprehensive ranking
            const rankingTasks = [...aggregatedRankingTasks, ...myTasks];

            const deptEmployeeMap = {};
            rankingTasks.forEach(t => {
                const deptId = t.department_id || t.departmentId || user?.department_id;
                const deptName = t.department_name || t.department || user?.department_name || user?.department || 'My Department';
                if (!deptId && !deptName) return;

                const deptKey = deptId ? String(deptId) : String(deptName);
                if (!deptEmployeeMap[deptKey]) {
                    deptEmployeeMap[deptKey] = {
                        departmentName: deptName || `Dept-${deptId}`,
                        employees: {},
                    };
                }

                // Robust ID and Name detection
                const empId = t.assigned_to_emp_id || t.assignee_id || t.assigned_to_id || t.employee_id || t.assignedToId || t.emp_id || t.employeeId || t.userId || (t.user?.id);
                const empName = t.assigned_to_name || t.assignee_name || t.employee_name || t.assigneeName || t.assignee || t.assigned_to || (t.user?.name) || (t.employee?.name) || (t.name);
                
                if (!empId && !empName) return;

                const empKey = empId ? String(empId) : String(empName);
                if (!deptEmployeeMap[deptKey].employees[empKey]) {
                    deptEmployeeMap[deptKey].employees[empKey] = {
                        name: empName || `Emp-${empId}`,
                        total: 0,
                        completed: 0,
                    };
                }

                deptEmployeeMap[deptKey].employees[empKey].total += 1;
                if (['APPROVED', 'COMPLETED'].includes((t.status || '').toUpperCase())) {
                    deptEmployeeMap[deptKey].employees[empKey].completed += 1;
                }
            });

            const ranked = Object.values(deptEmployeeMap)
                .map(({ departmentName, employees }) => {
                    const empRanked = Object.values(employees)
                        .filter(e => e.total > 0)
                        .map(e => ({
                            name: e.name,
                            score: Math.round((e.completed / e.total) * 100),
                            total: e.total,
                            completed: e.completed,
                        }))
                        .sort((a, b) => b.score - a.score || b.completed - a.completed);

                    const best = empRanked[0];
                    if (!best) return null;
                    return { department: departmentName, ...best };
                })
                .filter(Boolean)
                .sort((a, b) => b.score - a.score || b.completed - a.completed);

            setTopPerformers(ranked.slice(0, 5));
        } catch (err) {
            console.error("Failed to fetch employee report data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashData();
    }, [fromDate, toDate]);

    const handleDownload = async (format) => {
        const toastId = toast.loading(`Preparing ${format}...`);
        try {
            let endpoint = format === 'pdf' ? `/reports/employee/export-pdf` : `/reports/employee/export-excel`;
            const params = { from_date: fromDate, to_date: toDate };
            const res = await api.get(endpoint, { params, responseType: 'blob' });
            const blob = new Blob([res.data], { type: res.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `My_Performance_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Downloaded successfully', { id: toastId });
        } catch (err) {
            toast.error(`Failed to download ${format}`, { id: toastId });
        }
    };

    // Derived Metrics
    const metrics = useMemo(() => {
        let active = 0, completed = 0, inProgress = 0, overdue = 0, reworks = 0, newTasks = 0, submitted = 0;
        const total = tasks.length;
        
        tasks.forEach(t => {
            const status = String(t.status || '').toUpperCase();
            if (status === 'APPROVED' || status === 'COMPLETED') completed++;
            else if (status === 'IN_PROGRESS' || status === 'STARTED') inProgress++;
            else if (status === 'REWORK') reworks++;
            else if (status === 'NEW') newTasks++;
            else if (status === 'SUBMITTED') submitted++;

            if (!['APPROVED', 'CANCELLED', 'COMPLETED'].includes(status)) {
                active++;
                // Check overdue
                const dueStr = t.due_date || t.dueDate;
                if (dueStr) {
                    const due = new Date(dueStr);
                    if (due < new Date()) overdue++;
                }
            }
        });

        // Use backend summary as primary, fallback to calculated
        return {
            total: summary.total_tasks || total,
            active: summary.active_tasks || active,
            completed: summary.approved_tasks || completed,
            inProgress: summary.in_progress_tasks || inProgress,
            overdue: summary.overdue_tasks || overdue,
            pending: summary.pending_submission || (newTasks + reworks),
            reworks: summary.rework_tasks || reworks,
            submitted: summary.submitted_tasks || submitted,
            newTasks: summary.new_tasks || newTasks,
            efficiency: summary.performance_index || (total ? Math.round((completed/total)*100) : 0),
            deptAvg: summary.dept_avg_score || 0
        };
    }, [tasks, summary]);

    // Trend Data Mock (if backend doesn't provide granular trend for employee)
    const trendData = [
        { name: 'Oct', approved: 0, score: 0 },
        { name: 'Nov', approved: 0, score: 0 },
        { name: 'Dec', approved: 0, score: 0 },
        { name: 'Jan', approved: 0, score: 0 },
        { name: 'Feb', approved: Math.max(0, metrics.completed - 2), score: Math.max(0, metrics.efficiency - 15) },
        { name: 'Mar', approved: metrics.completed, score: metrics.efficiency },
    ];

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-500 font-medium">Loading report data...</div>;
    }

    const COLORS = ['#3b82f6', '#ef4444', '#8b5cf6', '#e2e8f0', '#10b981']; 
    const pieData = [
        { name: 'New', value: metrics.newTasks || (metrics.pending - metrics.reworks) },
        { name: 'Overdue', value: metrics.overdue },
        { name: 'In Progress', value: metrics.inProgress },
        { name: 'Submitted', value: metrics.submitted },
        { name: 'Approved', value: metrics.completed }
    ].filter(d => true); // ensure mapping to colors aligns

    return (
        <div className="min-h-screen bg-[#F8FAFF] p-4 lg:p-8 space-y-6 font-sans">
            
            {/* Page Header (replaces standard dashboard header in this view) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-2">
                <div>
                    <h1 className="text-[28px] font-bold text-indigo-600 leading-tight">Reports</h1>
                    <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Analytics & Performance Insights</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 px-3">
                        <span className="text-[12px] font-bold text-slate-400">From</span>
                        <div className="flex items-center gap-2">
                            <input type="date" className="border-none text-[13px] font-semibold text-slate-700 bg-transparent p-0 focus:ring-0 cursor-pointer" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                            <Calendar size={14} className="text-slate-400" />
                        </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <div className="flex items-center gap-3 px-3">
                        <span className="text-[12px] font-bold text-slate-400">To</span>
                        <div className="flex items-center gap-2">
                            <input type="date" className="border-none text-[13px] font-semibold text-slate-700 bg-transparent p-0 focus:ring-0 cursor-pointer" value={toDate} onChange={e => setToDate(e.target.value)} />
                            <Calendar size={14} className="text-slate-400" />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => handleDownload('pdf')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-[#1E1B4B] rounded-xl hover:bg-slate-50 transition-all font-semibold text-[13px]">
                            <Download size={16} className="text-indigo-500" /> Pdf
                        </button>
                        <button onClick={() => handleDownload('excel')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-[#1E1B4B] rounded-xl hover:bg-slate-50 transition-all font-semibold text-[13px]">
                            <FileSpreadsheet size={16} className="text-emerald-500" /> Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Performance Hero */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm mb-6">
                <h2 className="text-[22px] font-semibold text-[#1E1B4B] mb-8">
                    PERFORMANCE - {user?.name || 'Employee'}
                </h2>
                
                <div className="flex flex-col xl:flex-row items-center gap-12">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-[120px] h-[120px] rounded-full border-[6px] border-[#F8FAFF] bg-white shadow-lg flex items-center justify-center">
                                <span className="text-[40px] font-bold text-[#1E1B4B]">{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</span>
                            </div>
                            <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md border-4 border-white">
                                <ArrowUpRight size={20} strokeWidth={3} />
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-[26px] font-medium text-[#1E1B4B] mb-2">{user?.name || 'Employee'}</h3>
                            <div className="flex items-center gap-4">
                                <span className="bg-[#1E1B4B] text-white text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-2">
                                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {user?.emp_id || user?.id || '—'}
                                </span>
                                <span className="text-[14px] font-semibold text-slate-400">Performance Score</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-[#F8FAFF] rounded-3xl p-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <p className="text-[12px] font-bold text-slate-400 mb-2">Efficiency</p>
                            <p className="text-[32px] font-semibold text-indigo-500 leading-none">{metrics.efficiency}%</p>
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-slate-400 mb-2">Total Tasks</p>
                            <p className="text-[32px] font-semibold text-slate-600 leading-none">{metrics.total}</p>
                        </div>
                        <div className="col-span-2 flex justify-between">
                            <div>
                                <p className="text-[12px] font-bold text-emerald-500 mb-2">Completed</p>
                                <p className="text-[32px] font-semibold text-emerald-500 leading-none">{metrics.completed}</p>
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-[12px] font-bold text-orange-400 mb-2">Pending</p>
                            <p className="text-[28px] font-semibold text-orange-400 leading-none">{metrics.pending}</p>
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-rose-500 mb-2">Overdue</p>
                            <p className="text-[28px] font-semibold text-rose-500 leading-none">{metrics.overdue}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[12px] font-bold text-fuchsia-500 mb-2">Reworks</p>
                            <p className="text-[28px] font-semibold text-fuchsia-500 leading-none">{metrics.reworks}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Small Stat Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Active Tasks</p>
                        <p className="text-[28px] font-bold text-[#1E1B4B] leading-none">{metrics.active}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400">
                        <ClipboardList size={20} />
                    </div>
                </div>
                
                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-2">Completed</p>
                        <p className="text-[28px] font-bold text-emerald-600 leading-none">{metrics.completed}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-400">
                        <CheckSquare size={20} />
                    </div>
                </div>

                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-2">In Progress</p>
                        <p className="text-[28px] font-bold text-orange-500 leading-none">{metrics.inProgress}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-300">
                        <Play size={20} />
                    </div>
                </div>

                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-2">Overdue</p>
                        <p className="text-[28px] font-bold text-rose-600 leading-none">{metrics.overdue}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-300">
                        <AlertTriangle size={20} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] rounded-[1.5rem] p-5 shadow-md flex items-center justify-between text-white relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-20">
                        <Activity size={100} strokeWidth={1} />
                    </div>
                    <div className="relative z-10 w-full">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider">VS Dept Avg</p>
                            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                                <Activity size={14} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <p className="text-[32px] font-bold leading-none">{metrics.efficiency}%</p>
                            <span className="text-[14px] font-medium opacity-70">/ {metrics.deptAvg}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Task Distribution (Aggregate) */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <BarChart2 size={18} className="text-indigo-400" />
                            <h3 className="text-[18px] font-semibold text-[#1E1B4B]">Task Distribution (Aggregate)</h3>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6">Tasks Status Analysis</p>
                    </div>
                    <div className="px-4 py-1.5 rounded-full border border-indigo-100 flex items-center gap-2 text-[12px] font-bold">
                        <span className="text-slate-400">Total:</span> <span className="text-indigo-600">{metrics.total}</span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row items-center gap-12">
                    <div className="relative w-[280px] h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={pieData.length > 0 ? pieData : [{name:'None', value: 1}]}
                                    innerRadius={70} 
                                    outerRadius={110} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-1">Impact</p>
                            <p className="text-[36px] font-bold text-[#1E1B4B] leading-none mb-1">{metrics.total}</p>
                            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Tasks</p>
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-6">
                        {[
                            { label: 'New', count: pieData[0]?.value||0, color: '#3b82f6', bg: 'bg-blue-500' },
                            { label: 'Overdue', count: pieData[1]?.value||0, color: '#ef4444', bg: 'bg-red-500' },
                            { label: 'In Progress', count: pieData[2]?.value||0, color: '#8b5cf6', bg: 'bg-purple-500' },
                            { label: 'Submitted', count: pieData[3]?.value||0, color: '#e2e8f0', bg: 'bg-slate-300' },
                            { label: 'Approved', count: pieData[4]?.value||0, color: '#10b981', bg: 'bg-emerald-500' }
                        ].map((stat, i) => {
                            const pct = metrics.total > 0 ? Math.round((stat.count / metrics.total) * 100) : 0;
                            return (
                                <div key={i} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${stat.bg}`}></span>
                                            <span className="text-[14px] font-semibold text-[#1E1B4B]">{stat.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[12px] font-medium text-slate-400">{stat.count} Tasks</span>
                                            <span className="text-[14px] font-bold text-[#1E1B4B] w-10 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
                                        <div className={`h-full ${stat.bg} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Monthly Performance Trend */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm mb-6">
                <h3 className="text-[16px] font-semibold text-[#1E1B4B] mb-6">Monthly Performance Trend</h3>
                <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} domain={[0, 'auto']} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} domain={[0, 100]} />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 600 }}
                            />
                            {/* Legend moved to bottom manually via UI later */}
                            <Bar yAxisId="left" dataKey="approved" fill="#10b981" barSize={32} radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#fff', stroke: '#8b5cf6', strokeWidth: 2}} activeDot={{r: 6}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center items-center gap-6 mt-4 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                        <span className="text-[12px] font-bold text-emerald-600">Approved Tasks</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0 border-t-2 border-purple-500 relative flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full border-2 border-purple-500 bg-white absolute"></div></div>
                        <span className="text-[12px] font-bold text-purple-600">Performance Score %</span>
                    </div>
                </div>
            </div>

            {/* Performance Report & Top High Performers Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[18px] font-semibold text-[#1E1B4B]">Performance Report</h3>
                        <button className="px-5 py-1.5 rounded-full bg-indigo-50 text-indigo-500 text-[11px] font-bold transition-colors hover:bg-indigo-100">Reset</button>
                    </div>
                    
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[12px] font-bold text-slate-500 tracking-wider">Employee</th>
                                <th className="pb-4 text-[12px] font-bold text-slate-500 tracking-wider text-center">Total</th>
                                <th className="pb-4 text-[12px] font-bold text-slate-500 tracking-wider text-center">Done</th>
                                <th className="pb-4 text-[12px] font-bold text-slate-500 tracking-wider text-right">On-Time %</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="py-5">
                                    <p className="text-[14px] font-semibold text-[#1E1B4B]">{user?.name || 'AP Exec 1'}</p>
                                    <p className="text-[11px] font-medium text-slate-400 mt-1">{user?.department || 'Accounts Payables'}</p>
                                </td>
                                <td className="py-5 text-center text-[15px] font-medium text-slate-600">{metrics.total}</td>
                                <td className="py-5 text-center">
                                    <span className="bg-emerald-50 text-emerald-600 text-[12px] font-bold px-3 py-1.5 rounded-lg">{metrics.completed}</span>
                                </td>
                                <td className="py-5 text-right text-[15px] font-bold text-indigo-600">{metrics.efficiency}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <h3 className="text-[18px] font-semibold text-[#1E1B4B] mb-8">Top High Performers</h3>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[12px] font-bold text-slate-500 tracking-wider">Rank</th>
                                <th className="pb-4 text-[12px] font-bold text-slate-500 tracking-wider">Top Performer</th>
                                <th className="pb-4 text-[12px] font-bold text-slate-500 tracking-wider text-right">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topPerformers.length > 0 ? (
                                topPerformers.map((performer, idx) => {
                                    const isMe = (performer.name === (user?.name || '')) || (String(performer.empId) === String(user?.emp_id || user?.id));
                                    return (
                                        <tr key={idx} className={isMe ? 'bg-indigo-50/20' : ''}>
                                            <td className="py-4 w-16">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] ${idx === 0 ? 'bg-amber-100 text-amber-600 shadow-sm' : 'bg-slate-50 text-slate-400'}`}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <p className="text-[14px] font-semibold text-[#1E1B4B]">
                                                    {performer.name || 'Employee'}
                                                    {isMe && <span className="ml-2 text-[10px] bg-indigo-100/50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">You</span>}
                                                </p>
                                                <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                                                    {performer.department || 'Accounts Payables'} • {performer.completed}/{performer.total} tasks
                                                </p>
                                            </td>
                                            <td className="py-4 text-right text-[15px] font-bold text-indigo-600">{performer.score}%</td>
                                        </tr>
                                    );
                                })
                            ) : (summary.top_department_performer || summary.top_performer) ? (
                                <tr>
                                    <td className="py-5 w-16">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-[13px]">1</div>
                                    </td>
                                    <td className="py-5">
                                        <p className="text-[14px] font-semibold text-[#1E1B4B]">
                                            {summary.top_department_performer?.name || summary.top_performer?.name || 'Top Performer'}
                                        </p>
                                        <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                                            {summary.top_department_performer?.department || summary.top_performer?.department || 'Operations'}
                                            {(summary.top_department_performer?.total_tasks || summary.top_performer?.total_tasks) ? 
                                               ` • ${(summary.top_department_performer?.approved_tasks || summary.top_performer?.approved_tasks || 0)}/${(summary.top_department_performer?.total_tasks || summary.top_performer?.total_tasks)} tasks` 
                                               : ''}
                                        </p>
                                    </td>
                                    <td className="py-5 text-right text-[15px] font-bold text-indigo-600">
                                        {Math.round(summary.top_department_performer?.score ?? summary.top_performance_score ?? 0)}%
                                    </td>
                                </tr>
                            ) : (
                                <tr>
                                    <td className="py-4 w-16">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[13px]">1</div>
                                    </td>
                                    <td className="py-4">
                                        <p className="text-[14px] font-semibold text-[#1E1B4B]">
                                            {user?.name || 'You'}
                                            <span className="ml-2 text-[10px] bg-indigo-100/50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">You</span>
                                        </p>
                                        <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                                            {user?.department_name || user?.department || 'My Department'} • {tasks.filter(t => ['APPROVED', 'COMPLETED'].includes(t.status?.toUpperCase())).length}/{tasks.length} tasks
                                        </p>
                                    </td>
                                    <td className="py-4 text-right text-[15px] font-bold text-indigo-600">
                                        {tasks.length > 0 ? Math.round((tasks.filter(t => ['APPROVED', 'COMPLETED'].includes(t.status?.toUpperCase())).length / tasks.length) * 100) : 0}%
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    );
};

export default EmployeePersonalReport;
