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
    Loader2,
    Download,
    FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [openActionMenuId, setOpenActionMenuId] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [editingEmployee, setEditingEmployee] = useState(null);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const params = {};
            if (fromDate) params.fromDate = fromDate;
            if (toDate) params.toDate = toDate;
            const res = await api.get('/admin/summary', { params });
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
    }, [fromDate, toDate]);

    const handleResetPassword = async (emp) => {
        try {
            const pwd = "Perfmetric@123";
            await api.post(`/employees/${emp.emp_id}/reset-password`, { new_password: pwd });
            toast.success(`Password reset to: ${pwd} for ${emp.name}`, { duration: 6000 });
        } catch (err) {
            toast.error("Reset failed.");
        }
    };

    const handleToggleStatus = async (emp) => {
        const action = emp.active ? 'deactivate' : 'activate';
        try {
          await api.post(`/employees/${emp.emp_id}/${action}`);
          fetchSummary();
          toast.success(`${emp.name} updated.`);
        } catch (err) {
          toast.error("Status update failed.");
        }
    };

    const downloadFile = async (format) => {
        const toastId = toast.loading(`Preparing ${format.toUpperCase()} report...`);
        try {
            const role = (user?.role || '').toUpperCase();
            
            let endpoint = format === 'pdf' ? '/reports/cfo/export-pdf' : '/reports/cfo/export-excel';
            const params = {
                from_date: fromDate || summary?.period_start || undefined,
                to_date: toDate || summary?.period_end || undefined
            };

            const response = await api.get(endpoint, {
                params,
                responseType: 'blob'
            });

            if (response.data.size < 250) {
                const text = await response.data.text();
                try {
                    const errorJson = JSON.parse(text);
                    throw new Error(errorJson.detail || errorJson.message || 'Export failed');
                } catch (e) { /* Proceed if not JSON */ }
            }

            const contentType = response.headers['content-type'] || (format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            const blob = new Blob([response.data], { type: contentType });
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `admin_global_report_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);

            toast.success(`${format.toUpperCase()} downloaded successfully`, { id: toastId });
        } catch (err) {
            console.error(`Failed to download ${format}`, err);
            toast.error(err.message || `Failed to download ${format} report`, { id: toastId });
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 text-center md:text-left">
                <h1 className="text-[32px] font-black text-[#1E1B4B] tracking-tight">Admin Dashboard</h1>
                
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
                    <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-2xl border border-white shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-[12px] font-bold text-slate-700 p-0 focus:ring-0 cursor-pointer"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-2xl border border-white shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-[12px] font-bold text-slate-700 p-0 focus:ring-0 cursor-pointer"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                        <button 
                            onClick={() => downloadFile('excel')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm"
                        >
                            <FileSpreadsheet size={16} />
                            Excel
                        </button>
                        <button 
                            onClick={() => downloadFile('pdf')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-600 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all shadow-sm"
                        >
                            <Download size={16} />
                            PDF
                        </button>
                    </div>
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

            {/* Modals for Action Menu */}
            {(selectedEmployee || editingEmployee) && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-y-auto max-h-[90vh]">
                        {editingEmployee ? (
                            <div className="p-2">
                                {/* Simplified or Reused EmployeeFormModal if possible */}
                                <div className="p-8 text-center">
                                    <h3 className="text-xl font-black mb-4 uppercase">Edit Employee</h3>
                                    <p className="text-slate-500 mb-6">Editing {editingEmployee.name}. Use the main directory for full management.</p>
                                    <button onClick={() => setEditingEmployee(null)} className="px-8 py-3 bg-violet-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">Close</button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8">
                                <h3 className="text-xl font-black mb-4 uppercase">Employee Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-left mb-8">
                                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Name</p><p className="font-bold">{selectedEmployee.name}</p></div>
                                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Role</p><p className="font-bold capitalize">{selectedEmployee.role}</p></div>
                                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Dept</p><p className="font-bold">{selectedEmployee.department_name || selectedEmployee.department_id}</p></div>
                                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Status</p><p className="font-bold">{selectedEmployee.active ? 'Active' : 'Inactive'}</p></div>
                                </div>
                                <button onClick={() => setSelectedEmployee(null)} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest">Dismiss</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                                         <td className="px-8 py-4 text-[13px] text-slate-400 font-medium lowercase italic">{emp.email || (emp.emp_id ? `${String(emp.emp_id).toLowerCase()}@fjgroup.com` : 'n/a')}</td>
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
                                        <td className="px-10 py-4 text-right relative">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleResetPassword(emp)}
                                                    className="p-2 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-all active:scale-90"
                                                    title="Reset Password"
                                                >
                                                    <Key size={16} strokeWidth={2.5} />
                                                </button>
                                                <button 
                                                    onClick={() => setOpenActionMenuId(openActionMenuId === emp.emp_id ? null : emp.emp_id)}
                                                    className={`p-2 rounded-lg transition-all active:scale-90 ${openActionMenuId === emp.emp_id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                                >
                                                    <MoreHorizontal size={20} />
                                                </button>

                                                {openActionMenuId === emp.emp_id && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
                                                        <div className="absolute right-10 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right text-left">
                                                            <button 
                                                                onClick={() => { setSelectedEmployee(emp); setOpenActionMenuId(null); }}
                                                                className="w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                                                            >
                                                                View Profile
                                                            </button>
                                                            <button 
                                                                onClick={() => { navigate('/admin'); setOpenActionMenuId(null); }}
                                                                className="w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                                                            >
                                                                Full Edit
                                                            </button>
                                                            <button 
                                                                onClick={() => { handleToggleStatus(emp); setOpenActionMenuId(null); }}
                                                                className={`w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black transition-colors uppercase tracking-widest border-t border-slate-50 ${emp.active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                            >
                                                                {emp.active ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
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
