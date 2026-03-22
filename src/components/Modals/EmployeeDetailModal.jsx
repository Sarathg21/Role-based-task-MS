import {
    X, ShieldOff, Mail,
    Phone, Calendar, ChevronDown, Loader2, MoreHorizontal,
    CheckCircle2, Shield
} from 'lucide-react';

// Removed OrgRowMenu as it's no longer needed for the single record view

/* ── Main Modal ── */
const EmployeeDetailModal = ({ employee, departments = [], allEmployees = [], onClose, onResetPassword, onToggleStatus }) => {
    const [activeTab, setActiveTab] = useState('basic');
    const [openMenuId, setOpenMenuId] = useState(null);

    if (!employee) return null;

    const initials = (employee.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const manager = allEmployees.find(e => e.emp_id === employee.manager_emp_id);

    // Department colleagues
    const orgColleagues = allEmployees
        .filter(e => (e.department_id && e.department_id === employee.department_id) || (e.department && e.department === employee.department))
        .slice(0, 8);

    const TABS = [
        { id: 'basic', label: 'Basic Info' },
        { id: 'org', label: 'Organization Info' },
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* ── HEADER ── */}
                <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-violet-50">
                    <h2 className="text-[20px] font-semibold text-[#1E1B4B]">Employee Detail</h2>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* ── TABS ── */}
                <div className="flex items-center gap-1 px-8 pt-4 border-b border-violet-50/60 bg-white">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2.5 text-[13px] font-medium transition-all border-b-2 ${
                                activeTab === tab.id
                                    ? 'text-[#7B51ED] border-[#7B51ED]'
                                    : 'text-slate-500 border-transparent hover:text-[#7B51ED]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── BODY ── */}
                <div className="p-8 bg-[#faf8ff] min-h-[400px] max-h-[75vh] overflow-y-auto custom-scrollbar">

                    {/* ─── BASIC INFO TAB ─── */}
                    {activeTab === 'basic' && (
                        <div className="bg-white rounded-[1.5rem] border border-violet-50 shadow-sm p-6">
                            <h3 className="text-[15px] font-semibold text-[#1E1B4B] mb-6">Basic Info</h3>
                            <div className="flex items-start gap-8">
                                {/* Avatar */}
                                <div className="flex flex-col items-center gap-2 shrink-0">
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-200 to-indigo-200 flex items-center justify-center text-2xl font-bold text-[#7B51ED] shadow-md border-4 border-white">
                                        {initials}
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-500 tracking-wide">{employee.emp_id}</span>
                                </div>
                                {/* Fields */}
                                <div className="flex-1 space-y-3.5">
                                    <div className="text-[11px] text-slate-400">ID: {employee.emp_id}</div>
                                    <div className="text-[18px] font-bold text-[#1E1B4B]">{employee.name}</div>
                                    <div className="flex items-center gap-2 text-[13px] text-slate-600">
                                        <Mail size={14} className="text-violet-400 shrink-0" />
                                        {employee.email || `${(employee.emp_id || '').toLowerCase()}@fjgroup.com`}
                                    </div>
                                    <div className="flex items-center gap-2 text-[13px] text-slate-600">
                                        <Phone size={14} className="text-violet-400 shrink-0" />
                                        {employee.phone || '+1 352-555-0167'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[13px] text-slate-600">
                                        <Calendar size={14} className="text-violet-400 shrink-0" />
                                        Start:{' '}
                                        {employee.created_at
                                            ? new Date(employee.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                            : 'April 20, 2024'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[13px] text-slate-600">
                                        <span className="text-violet-400 text-[11px] font-semibold">DEPT</span>
                                        {employee.department_id || employee.department || '—'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[13px] text-slate-600">
                                        <span className="text-violet-400 text-[11px] font-semibold">MANAGER</span>
                                        {manager?.name || employee.manager_emp_id || '—'}
                                    </div>
                                    <div className="pt-1">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${employee.active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${employee.active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            {employee.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── ORGANIZATION INFO TAB ─── */}
                    {activeTab === 'org' && (
                        <div className="bg-white rounded-[2rem] border border-violet-50 shadow-sm p-10 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center gap-5 border-b border-slate-50 pb-6">
                                <div className="p-4 bg-indigo-50 rounded-2xl">
                                    <Shield size={24} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Organization Position</h3>
                                    <p className="text-sm text-slate-400 font-medium">Core structural data for {employee.name}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Job Role</p>
                                    <p className="text-[15px] font-bold text-slate-700 capitalize">{(employee.role || 'Employee').toLowerCase()}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Department</p>
                                    <p className="text-[15px] font-bold text-slate-700">{employee.department_id || employee.department || '—'}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Reporting Manager</p>
                                    <p className="text-[15px] font-bold text-slate-700">{manager?.name || 'No Direct Manager'}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Current Status</p>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[13px] font-bold ${employee.active ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        <CheckCircle2 size={14} className={!employee.active ? 'hidden' : ''} />
                                        {employee.active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                             <div className="pt-8 border-t border-slate-50">
                                <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-[0.15em] mb-4">Department Colleagues</h4>
                                <div className="space-y-3">
                                    {orgColleagues.filter(e => e.emp_id !== employee.emp_id).length > 0 ? (
                                        orgColleagues.filter(e => e.emp_id !== employee.emp_id).map((colleague) => (
                                            <div key={colleague.emp_id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 hover:bg-white hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-500 border-2 border-white shadow-sm">
                                                        {(colleague.name || colleague.emp_id || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-bold text-slate-700">{colleague.name}</p>
                                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{colleague.role?.toLowerCase()}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${colleague.active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                         {colleague.active ? 'Active' : 'Inactive'}
                                                     </span>
                                                 </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[11px] text-slate-400 italic">No other colleagues in this department.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* ── FOOTER ── */}
                <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-violet-50 bg-white">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetailModal;
