import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { TASKS, USERS, DEPARTMENTS } from '../../data/mockData';
import { getEmployeeRankings, getManagerRankings } from '../../utils/rankingEngine';
import StatsCard from '../UI/StatsCard';
import ChartPanel from '../Charts/ChartPanel';
import { Users, Briefcase, Activity, Award, Building2, Shield, Plus, Settings, MessageSquare, ChevronDown, CheckCircle, User, Edit2, CheckSquare, Loader2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [filters, setFilters] = useState({
        department: 'All',
        role: 'All',
        dateFrom: '',
        dateTo: '',
        performanceMin: '',
        performanceMax: ''
    });

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return 'Just now';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            if (diffInSeconds < 60) return `${Math.max(0, diffInSeconds)}s ago`;
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) return `${diffInHours}h ago`;
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays}d ago`;
        } catch (e) { return 'Recent'; }
    };

    const fetchActivities = async () => {
        setLoadingActivities(true);
        try {
            const res = await api.get('/notifications');
            const raw = res.data;
            let data = [];
            if (Array.isArray(raw)) {
                data = raw;
            } else if (raw && typeof raw === 'object') {
                data = raw.notifications ?? raw.data ?? raw.items ?? raw.results ?? raw.records ?? [];
                if (!Array.isArray(data)) data = [];
            }
            setActivities(data);
        } catch (err) {
            console.error("Failed to fetch admin activities:", err);
        } finally {
            setLoadingActivities(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, []);

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
        <div className="space-y-6 animate-fade-in pb-8 mt-4">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#4285F4] text-white rounded-[1.5rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                    <div>
                        <span className="text-5xl font-bold tracking-tight">{stats.employees + stats.managers || 8}</span>
                        <p className="text-[15px] font-medium mt-1 text-white/90">Total Users</p>
                    </div>
                    <div className="absolute right-4 bottom-4 opacity-20">
                        <Users size={72} strokeWidth={1.5} />
                    </div>
                </div>

                <div className="bg-[#9B51E0] text-white rounded-[1.5rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-28 border border-[#a259e8]">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-5xl font-bold tracking-tight">{stats.departments || 3}</span>
                            <p className="text-[15px] font-medium mt-1 text-white/90">Teams</p>
                        </div>
                        <div className="opacity-40 mt-2">
                            <Users size={32} />
                        </div>
                    </div>
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                        <div className="w-32 h-32 rounded-full border-[12px] border-white"></div>
                    </div>
                </div>

                <div className="bg-[#34D399] text-white rounded-[1.5rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-5xl font-bold tracking-tight">2</span>
                            <p className="text-[15px] font-medium mt-1 text-white/90">Pending Users</p>
                        </div>
                        <div className="opacity-40 mt-2">
                            <CheckCircle size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Split */}
            <div className="flex flex-col xl:flex-row gap-6">
                {/* Left Side - Team Members Table */}
                <div className="flex-[7] bg-white rounded-[1.5rem] p-0 shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between pt-6 px-6 border-b border-slate-100 pb-4">
                        <h2 className="text-[17px] font-bold text-slate-800">Team Members</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[12px] text-slate-400 border-b border-slate-100 bg-slate-50/30">
                                <tr>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Name</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Role <ChevronDown size={14} className="inline ml-1" /></th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Open Tasks <ChevronDown size={14} className="inline ml-1" /></th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-center">Status</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {[
                                    { id: 1, name: 'Linda Zhang', role: 'Developer', tasks: 4, status: 'Active', char: 'L' },
                                    { id: 2, name: 'John Doe', role: 'Designer', tasks: 2, status: 'Active', char: 'J' },
                                    { id: 3, name: 'Anna Brown', role: 'Manager', tasks: 5, status: 'Pending', char: 'A' },
                                    { id: 4, name: 'Mark Wilson', role: 'Developer', tasks: 3, status: 'Active', char: 'M' },
                                    { id: 5, name: 'John Doe', role: 'QA Tester', tasks: 1, status: 'Active', char: 'J' }
                                ].map(member => (
                                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-2 px-6 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 font-bold overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-white text-xs">
                                                {member.char}
                                            </div>
                                            <span className="text-[13.5px] font-semibold text-slate-700 truncate">{member.name}</span>
                                        </td>
                                        <td className="py-2 px-6">
                                            <span className="text-[13px] font-medium text-slate-600">{member.role}</span>
                                        </td>
                                        <td className="py-2 px-6">
                                            <span className="text-[13px] font-medium text-slate-600 ml-4">{member.tasks}</span>
                                        </td>
                                        <td className="py-2 px-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold shadow-sm inline-block min-w-[70px] ${member.status === 'Active' ? 'bg-[#EAF5F0] text-[#10B981]' : 'bg-[#FFF3E0] text-[#F59E0B]'}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td className="py-2 px-6 text-right">
                                            <button className="px-5 py-1.5 bg-[#7B51ED] text-white text-[12px] font-bold rounded-lg hover:bg-violet-700 transition-[transform,colors] active:scale-95 shadow-sm inline-flex items-center gap-1.5">
                                                <Edit2 size={12} /> Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                            <span>Showing 5 of 8</span>
                            <div className="flex items-center gap-1">
                                <span className="mr-2">Showing 5 of 8</span>
                                <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition">&lt;</button>
                                <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#7B51ED] text-white font-bold shadow-sm">1</button>
                                <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-600">2</button>
                                <span className="px-1 text-slate-400">...</span>
                                <button className="px-3 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-600 font-semibold">Next</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Actions & Activity */}
                <div className="flex-[2.5] flex flex-col gap-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 ml-1">Quick Actions</h3>
                        <div className="flex flex-col gap-3">
                            <button className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <Plus size={18} strokeWidth={2.5} /> Create New Task
                            </button>
                            <button className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <User size={18} strokeWidth={2.5} /> Add User
                            </button>
                            <button onClick={() => navigate('/reports')} className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <Activity size={18} strokeWidth={2.5} /> View Reports
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px]">
                        <div className="flex justify-between items-center mb-4 ml-1">
                            <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                            <button className="text-slate-400 hover:text-slate-600"><Settings size={16} /></button>
                        </div>

                        <div className="space-y-3">
                            {loadingActivities ? (
                                <div className="py-10 text-center">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Syncing Activity...</p>
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No recent activity</p>
                                </div>
                            ) : (
                                activities.slice(0, 5).map((n, idx) => (
                                    <div key={n.id || idx} className="flex gap-3 items-start border border-slate-100 p-3.5 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                        <div className={`w-9 h-9 border-2 border-white shadow-sm rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm ${n.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' :
                                            n.type === 'WARNING' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                                            }`}>
                                            {(n.actor_name || n.title || 'N').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 pt-0.5 min-w-0">
                                            <p className="text-[13px] text-slate-600 leading-tight">
                                                <span className="font-bold text-slate-800">{n.title || 'Activity'}</span>
                                                <span className="block text-slate-500 mt-1 text-[12px]">{n.message}</span>
                                            </p>
                                            <p className="text-[11px] font-medium text-slate-400 mt-1">{formatTimeAgo(n.created_at)}</p>
                                        </div>
                                        <MessageSquare size={14} className="text-slate-300 mt-1 shrink-0" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
