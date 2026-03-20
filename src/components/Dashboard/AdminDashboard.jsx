import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
    Users, 
    UserCheck, 
    UserX, 
    Building2, 
    RefreshCw, 
    Search, 
    Plus, 
    Key, 
    MoreHorizontal,
    CheckSquare,
    Calendar,
    Loader2
} from 'lucide-react';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/summary');
            setSummary(res.data);
        } catch (err) {
            console.error("Failed to fetch admin summary:", err);
            toast.error("Failed to sync dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    const handleResetPassword = async (emp) => {
        try {
            await api.post(`/employees/${emp.emp_id}/reset-password`, { new_password: "Password123" });
            toast.success(`Password reset for ${emp.name}`);
        } catch (err) {
            toast.error("Reset failed.");
        }
    };

    const StatCard = ({ icon: Icon, title, value, subValue, iconColor, iconBg }) => (
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-sm flex flex-col justify-between hover:shadow-md transition-all group flex-1 min-w-[200px]">
            <div className="flex items-center gap-3 mb-6">
                <div className={`w-9 h-9 rounded-full ${iconBg} ${iconColor} flex items-center justify-center`}>
                    <Icon size={18} />
                </div>
                <span className="text-slate-500 font-bold text-[13px] tracking-tight">{title}</span>
            </div>
            <div className="flex items-baseline gap-3">
                <span className="text-[36px] font-black text-slate-800 leading-none">{value}</span>
                {subValue && (
                    <span className="text-[13px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg">
                        {subValue}
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f3edfd] p-8 md:p-12 animate-in fade-in duration-1000 selection:bg-indigo-100 selection:text-indigo-900 rounded-[3rem] mx-2 my-2 shadow-[inset_0_0_80px_rgba(139,92,246,0.05)]">
            
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <h1 className="text-[32px] font-black text-[#1E1B4B] tracking-tight">Admin Dashboard</h1>
                
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-500 transition-all pointer-events-none" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search..."
                            className="bg-white rounded-full pl-12 pr-6 py-3.5 w-64 md:w-80 text-[14px] font-medium border border-white shadow-sm focus:ring-8 focus:ring-violet-500/5 focus:outline-none transition-all placeholder:text-slate-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => navigate('/admin')}
                        className="w-12 h-12 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-violet-200 hover:bg-violet-700 hover:scale-110 active:scale-95 transition-all"
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* ── STATS ROW ── */}
            <div className="flex flex-wrap gap-6 mb-12">
                <StatCard 
                    icon={Users} 
                    title="Total Employees" 
                    value={summary?.total_employees ?? '...'} 
                    iconBg="bg-blue-50" iconColor="text-blue-500" 
                />
                <StatCard 
                    icon={UserCheck} 
                    title="Active" 
                    value={summary?.active_employees ?? '...'} 
                    subValue="(+12)"
                    iconBg="bg-emerald-50" iconColor="text-emerald-500" 
                />
                <StatCard 
                    icon={UserX} 
                    title="Inactive" 
                    value={(summary?.total_employees || 0) - (summary?.active_employees || 0)} 
                    iconBg="bg-orange-50" iconColor="text-orange-500" 
                />
                <StatCard 
                    icon={Building2} 
                    title="Departments" 
                    value={summary?.total_departments ?? '...'} 
                    iconBg="bg-indigo-50" iconColor="text-indigo-500" 
                />
                <StatCard 
                    icon={RefreshCw} 
                    title="Recurring" 
                    value={summary?.active_recurring_templates ?? '...'} 
                    iconBg="bg-violet-50" iconColor="text-violet-500" 
                />
            </div>

            {/* ── RECENTLY ADDED SECTION ── */}
            <div className="bg-white/70 backdrop-blur-3xl rounded-[3rem] shadow-2xl shadow-indigo-200/20 border border-white overflow-hidden flex flex-col min-h-[500px]">
                <div className="px-10 py-8 border-b border-indigo-50/50 flex justify-between items-center">
                    <h2 className="text-[20px] font-black text-[#1E1B4B]">Recently Added Employees</h2>
                    <button 
                        onClick={fetchSummary}
                        className="p-2.5 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-indigo-50/30 text-[11px] font-black text-indigo-300 uppercase tracking-widest border-b border-indigo-50/50">
                            <tr>
                                <th className="px-10 py-5">Name</th>
                                <th className="px-8 py-5">Department</th>
                                <th className="px-8 py-5">Email</th>
                                <th className="px-8 py-5">Role</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-10 py-5">Date Added</th>
                                <th className="px-10 py-5 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-50/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-40 text-center">
                                        <Loader2 className="animate-spin text-violet-600 mx-auto" size={42} />
                                    </td>
                                </tr>
                            ) : !summary?.recent_employees?.length ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">No recent activity detected.</td>
                                </tr>
                            ) : (
                                summary.recent_employees.map((emp) => (
                                    <tr key={emp.emp_id} className="group hover:bg-white transition-all duration-300">
                                        <td className="px-10 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-500 font-black text-sm group-hover:scale-110 transition-transform">
                                                    <span>{emp.name?.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <span className="text-[14px] font-black text-slate-700 tracking-tight capitalize">{emp.name?.toLowerCase()}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="text-[13px] font-bold text-slate-500 capitalize">{(emp.department_name || emp.department_id || '—').toLowerCase()}</span>
                                        </td>
                                        <td className="px-8 py-4 text-[13px] text-slate-400 font-medium lowercase italic">{emp.email || 'n/a'}</td>
                                        <td className="px-8 py-4">
                                            <span className="text-[12px] font-black text-slate-400 tracking-tighter capitalize">{emp.role?.toLowerCase()}</span>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-emerald-50 text-emerald-600 border-emerald-100`}>
                                                <CheckSquare size={13} className="animate-pulse" />
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-10 py-4 text-[13px] font-bold text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="opacity-50" />
                                                {emp.created_at ? new Date(emp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Apr 15, 2024'}
                                            </div>
                                        </td>
                                        <td className="px-10 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleResetPassword(emp)}
                                                    className="p-2 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-all active:scale-90"
                                                    title="Reset Password"
                                                >
                                                    <Key size={16} strokeWidth={2.5} />
                                                </button>
                                                <button className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90">
                                                    <MoreHorizontal size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer link */}
                <div className="mt-auto px-10 py-6 bg-indigo-50/10 border-t border-indigo-50/50 flex justify-between items-center">
                    <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">Global Personnel Access Registry</p>
                    <button 
                        onClick={() => navigate('/admin')}
                        className="text-[12px] font-black text-violet-600 hover:text-violet-700 underline underline-offset-4 decoration-2 decoration-violet-200 hover:decoration-violet-500 transition-all uppercase"
                    >
                        View Directory &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
