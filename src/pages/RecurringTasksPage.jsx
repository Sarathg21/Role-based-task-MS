import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
    RefreshCw, Plus, Clock, Play, Pause, Trash2, 
    Calendar, User, Building2, AlertCircle, Loader2, ArrowLeft, 
    Settings, MoreHorizontal, CheckCircle2, XCircle, ChevronDown, ChevronRight,
    ListTodo, Info, Edit2, Check
} from 'lucide-react';
import AutomationConfigModal from '../components/Modals/AutomationConfigModal';
import { useAuth } from '../context/AuthContext';

const RecurringTasksPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdminOrCFO = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'CFO';
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [configModal, setConfigModal] = useState({ isOpen: false, template: null });
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterFrequency, setFilterFrequency] = useState('ALL');
    const [isFreqOpen, setIsFreqOpen] = useState(false);
    const [isTempOpen, setIsTempOpen] = useState(false);
    const [rowMenuId, setRowMenuId] = useState(null);
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    const handleRunRecurring = async () => {
        if (!window.confirm("Run the recurring task generator for today? This will manually trigger the generation of all scheduled tasks.")) return;
        
        setIsRunning(true);
        const toastId = toast.loading("Executing recurring task generator...");
        try {
            const today = new Date().toISOString().slice(0, 10);
            const res = await api.post('/recurring-tasks/run', { run_date: today });
            const { generated_count, skipped_count } = res.data;
            
            toast.success(
                <div className="flex flex-col gap-1">
                    <p className="font-bold">Generator Execution Complete</p>
                    <p className="text-xs">{generated_count} tasks generated, {skipped_count} skipped.</p>
                </div>, 
                { id: toastId, duration: 5000 }
            );
            
            // Refresh the OKR dashboard or relevant lists if needed
            // But here we just refresh the local template list to show status updates if any
            fetchInitial(); 
        } catch (err) {
            console.error("Manual trigger failed", err);
            toast.error("Failed to run recurring tasks: " + (err.response?.data?.detail || err.message), { id: toastId });
        } finally {
            setIsRunning(false);
        }
    };

    // Filter templates based on status, search, and frequency
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
            const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
            const freqVal = String(t.frequency || '').toUpperCase();
            const matchesFreq = filterFrequency === 'ALL' || freqVal === filterFrequency;
            return matchesStatus && matchesSearch && matchesFreq;
        });
    }, [templates, filterStatus, searchQuery, filterFrequency]);

    const fetchSubtasks = async (rid) => {
        try {
            // Use a short per-request timeout so a slow endpoint doesn't time out the whole page
            const res = await api.get(`/recurring-tasks/${rid}/subtasks`, { timeout: 8000 });
            const data = res.data?.data || res.data;
            setTemplates(prev => prev.map(t => 
                (t.id || t.recurring_id) === rid ? { ...t, subtasks: Array.isArray(data) ? data : [] } : t
            ));
        } catch (err) {
            if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                console.warn(`Subtask fetch timed out for task ${rid} — skipping`);
            } else {
                console.error("Subtask fetch failed", err);
            }
            // Set empty subtasks so the row still renders cleanly
            setTemplates(prev => prev.map(t => 
                (t.id || t.recurring_id) === rid ? { ...t, subtasks: [] } : t
            ));
        }
    };

    const selectedTemplate = useMemo(() => {
        const t = templates.find(t => (t.id || t.recurring_id) === selectedTemplateId) || templates[0];
        return t;
    }, [templates, selectedTemplateId]);

    // Lazy-load subtasks only when a row is actually expanded
    useEffect(() => {
        if (expandedRowId) {
            fetchSubtasks(expandedRowId);
        }
    }, [expandedRowId]);

    const fetchInitial = async () => {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('id') || params.get('taskId');
        
        setLoading(true);
        try {
            // Single call with large limit — avoids sending redundant parallel requests
            const endpointCalls = [
                api.get('/recurring-tasks', { params: { limit: 200 } }), // Standard (Personal or Default)
            ];

            if (isAdminOrCFO) {
                // Try scope=org (standard for Admin/CFO in this backend)
                endpointCalls.push(api.get('/recurring-tasks', { params: { scope: 'org', limit: 200 } }).catch(() => ({ data: [] })));
                endpointCalls.push(api.get('/recurring-tasks', { params: { limit: 200 } }).catch(() => ({ data: [] })));
            } else if (user?.role?.toUpperCase() === 'MANAGER') {
                // Try department scope for managers
                endpointCalls.push(api.get('/recurring-tasks', { params: { scope: 'department', limit: 200 } }).catch(() => ({ data: [] })));
            }

            const results = await Promise.allSettled(endpointCalls);

            // Helper to extract array from any response shape
            const extractList = (res) => {
                if (!res || res.status !== 'fulfilled' || !res.value) return [];
                const body = res.value.data;
                if (!body) return [];
                
                // Direct array
                if (Array.isArray(body)) return body;
                
                // Unwrap if backend sends { data: [], status: 200 } or { items: [] }
                const raw = body.data || body.items || body.results || body.recurring_tasks || body.tasks || body;
                if (Array.isArray(raw)) return raw;
                
                // Deep extract for legacy shapes
                if (body.data && Array.isArray(body.data.items)) return body.data.items;
                if (body.data && Array.isArray(body.data.data)) return body.data.data;
                
                return [];
            };

            // Merge all results and de-duplicate by ID
            const merged = [];
            results.forEach(r => {
                extractList(r).forEach(t => {
                    const tid = t.id || t.recurring_id;
                    if (!merged.some(m => (m.id || m.recurring_id) === tid)) merged.push(t);
                });
            });

            // ✅ Normalise
            const templateList = merged.map(t => ({
                ...t,
                status: String(t.status || '').toUpperCase() === 'ACTIVE' || 
                        String(t.status || '').toUpperCase() === 'INACTIVE' 
                        ? String(t.status).toUpperCase()
                        : (t.active === true || t.is_active === true ? 'ACTIVE' :
                           t.active === false || t.is_active === false ? 'INACTIVE' : 'ACTIVE')
            }));

            setTemplates(templateList);
            
            if (urlId) {
                const numericId = isNaN(urlId) ? urlId : parseInt(urlId, 10);
                const matching = templateList.find(t => (t.id || t.recurring_id) == urlId || (t.id || t.recurring_id) == numericId);
                if (matching) {
                    setSelectedTemplateId(matching.id || matching.recurring_id);
                } else if (templateList.length > 0) {
                    setSelectedTemplateId(templateList[0].id || templateList[0].recurring_id);
                }
            } else if (templateList.length > 0) {
                setSelectedTemplateId(templateList[0].id || templateList[0].recurring_id);
            }
        } catch (err) {
            console.error("Fetch failed", err);
            toast.error("Failed to load automation configurations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitial();
    }, [user, isAdminOrCFO]);

    const handleToggleStatus = async (template) => {
        const id = template.id || template.recurring_id;
        // Handle both `status: 'ACTIVE'` (string) and `active: true` (boolean)
        const isActive = template.status === 'ACTIVE' || template.active === true;
        const newStatus = isActive ? 'INACTIVE' : 'ACTIVE';
        const endpoint = isActive ? 'deactivate' : 'activate';
        
        setActionLoading(id);
        try {
            await api.post(`/recurring-tasks/${id}/${endpoint}`);
            setTemplates(prev => prev.map(t => 
                (t.id || t.recurring_id) === id ? { ...t, status: newStatus, active: !isActive } : t
            ));
            toast.success(`Task ${isActive ? 'paused' : 'activated'} successfully`);
        } catch (err) {
            toast.error("Failed to update status");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (template) => {
        const id = template.id || template.recurring_id;
        if (!window.confirm("Are you sure you want to permanently delete this recurring template? This action will destroy the template and its associated subtasks, preventing future generations.")) return;
        
        setActionLoading(id);
        const numericId = !isNaN(id) ? parseInt(id, 10) : id;
        
        try {
            let success = false;
            let lastError = null;

            // Aggressive fallback to catch misconfigured nested backend routes
            const attempts = [
                () => api.delete(`/recurring-tasks/recurring-tasks/${numericId}`), // ✅ User verified Swagger route
                () => api.delete(`/recurring-tasks/${numericId}`),
                () => api.delete(`/admin/recurring-tasks/${numericId}`),
                () => api.delete(`/recurring-tasks/${numericId}/`),
                () => api.post(`/recurring-tasks/${numericId}/delete`)
            ];

            for (const attempt of attempts) {
                try {
                    await attempt();
                    success = true;
                    break;
                } catch (err) {
                    lastError = err;
                    if (err.response?.status === 400 || err.response?.status === 403 || err.response?.status === 422) {
                        break; // Stop retrying if strictly blocked
                    }
                    continue; // 404, 405 -> Keep trying next route
                }
            }

            if (!success) throw lastError;

            setTemplates(prev => prev.filter(t => (t.id || t.recurring_id) !== id));
            if (selectedTemplateId === id) setSelectedTemplateId(null);
            toast.success("Recurring template and its subtasks deleted successfully");
        } catch (err) {
            console.error("Deletion failed", err);
            let errorMsg = "Server error. Please try again.";
            if (err?.response?.status === 404) {
                errorMsg = "404 Not Found - Server Route missing (Check backend).";
            } else if (err?.response?.status === 405) {
                errorMsg = "Method Not Allowed - Check backend DELETE mapping.";
            } else if (err?.response?.data?.detail) {
                const detail = err.response.data.detail;
                errorMsg = Array.isArray(detail)
                    ? detail.map(d => `${d.loc?.join('.') || 'body'}: ${d.msg}`).join(", ")
                    : detail;
            } else if (err?.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else if (err?.message) {
                errorMsg = err.message;
            }
            toast.error("Delete blocked: " + errorMsg, { duration: 6000 });
        } finally {
            setActionLoading(null);
        }
    };

    const formatFrequency = (template) => {
        if (!template) return '—';
        const freq = String(template.frequency || '').toUpperCase();
        if (freq === 'DAILY') return 'Daily';
        if (freq === 'WEEKLY') return `Weekly (${template.weekly_day || 'Monday'})`;
        if (freq === 'MONTHLY') return 'Monthly';
        if (freq === 'QUARTERLY') return 'Quarterly';
        if (freq === 'YEARLY') return 'Yearly';
        // Numeric values like '1' stored by backend — treat as Weekly
        if (/^\d+$/.test(freq)) return 'Weekly';
        return freq || 'Daily';
    };

    const handleRunRecurringTasks = async () => {
        if (!window.confirm("Manually trigger task generation for today? This will execute the automation engine now.")) return;
        
        const tid = toast.loading('Executing automation engine...', { duration: 10000 });
        setIsRunning(true);
        try {
            const today = new Date().toISOString().slice(0, 10);
            const res = await api.post('/recurring-tasks/run', { run_date: today });
            const data = res.data || {};
            const generated = data.generated_count ?? 0;
            const skipped = data.skipped_count ?? 0;
            const taskList = data.generated_tasks || [];

            toast.success(
                <div className="flex flex-col gap-1 items-start text-left">
                    <p className="font-black text-[13px]">Automation Complete</p>
                    <p className="text-[11px] font-medium opacity-90 leading-tight">
                        <span className="text-emerald-300 font-bold">{generated} tasks</span> created successfully.<br/>
                        <span className="text-orange-200 font-bold">{skipped} tasks</span> were skipped/duplicate.
                    </p>
                    {taskList.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {taskList.slice(0, 3).map((t, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-bold">
                                    {t.title || t}
                                </span>
                            ))}
                            {taskList.length > 3 && <span className="text-[9px] opacity-60">+{taskList.length - 3} more</span>}
                        </div>
                    )}
                </div>, 
                { id: tid, duration: 6000 }
            );
            
            // Re-fetch everything to show the updated state (last_run, etc)
            fetchInitial();
        } catch (err) {
            console.error("Manual trigger failed", err);
            toast.error('Failed to execute recurring tasks engine: ' + (err.response?.data?.detail || err.message), { id: tid });
        } finally {
            setIsRunning(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#f3edfd] p-8 md:p-12 animate-in fade-in duration-1000 selection:bg-indigo-100 selection:text-indigo-900 rounded-[3rem] mx-2 my-2 shadow-[inset_0_0_80px_rgba(139,92,246,0.05)]">
            
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-[32px] font-black text-[#1E1B4B] tracking-tight">Recurring Tasks</h1>
                    <p className="text-slate-400 font-bold capitalize tracking-[0.3em] text-[10px] mt-1">Automation & Governance Lifecycle</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {isAdminOrCFO && (
                        <button 
                            onClick={handleRunRecurringTasks}
                            className="bg-white text-indigo-600 px-6 py-3.5 rounded-2xl font-black text-[13px] shadow-sm hover:shadow-md border border-indigo-100/50 hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                            title="Manually trigger recurring tasks engine for today"
                        >
                            <Play size={16} strokeWidth={3} className="text-emerald-500" /> Run Recurring Tasks
                        </button>
                    )}
                    <button 
                        onClick={() => setConfigModal({ isOpen: true, template: null })}
                        className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-[13px] shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                    >
                        <Plus size={20} strokeWidth={3} /> Add Recurring Task
                    </button>
                </div>
            </div>

            {/* ── FILTERS ── */}
            <div className="flex items-center gap-3 mb-8">
                {/* Template Filter/Search */}
                <div className="relative">
                    <button 
                        onClick={() => setIsTempOpen(!isTempOpen)}
                        className={`flex items-center gap-3 px-6 py-2.5 bg-white/80 backdrop-blur-xl border border-white rounded-xl shadow-sm hover:shadow-md transition-all font-bold text-[13px] ${searchQuery ? 'text-indigo-600' : 'text-slate-600'}`}
                    >
                        {searchQuery ? `Template: ${searchQuery}` : 'Template'}
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isTempOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isTempOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsTempOpen(false)} />
                            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in zoom-in-95 duration-200">
                                <div className="relative mb-3">
                                    <input 
                                        type="text" 
                                        placeholder="Search by title..."
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                    <button 
                                        onClick={() => { setSearchQuery(''); setIsTempOpen(false); }}
                                        className="w-full text-left px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors uppercase tracking-widest"
                                    >
                                        Clear Filter
                                    </button>
                                    {templates.slice(0, 8).map(t => (
                                        <button 
                                            key={t.id || t.recurring_id}
                                            onClick={() => { setSearchQuery(t.title); setIsTempOpen(false); }}
                                            className="w-full text-left px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-between"
                                        >
                                            <span className="truncate">{t.title}</span>
                                            {searchQuery === t.title && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Frequency Filter */}
                <div className="relative">
                    <button 
                        onClick={() => setIsFreqOpen(!isFreqOpen)}
                        className={`flex items-center gap-3 px-6 py-2.5 bg-white/80 backdrop-blur-xl border border-white rounded-xl shadow-sm hover:shadow-md transition-all font-bold text-[13px] ${filterFrequency !== 'ALL' ? 'text-indigo-600' : 'text-slate-600'}`}
                    >
                        {filterFrequency === 'ALL' ? 'Frequency' : `Frequency: ${filterFrequency}`}
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isFreqOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isFreqOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsFreqOpen(false)} />
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in zoom-in-95 duration-200">
                                {['ALL', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map(f => (
                                    <button 
                                        key={f}
                                        onClick={() => { setFilterFrequency(f); setIsFreqOpen(false); }}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all mb-0.5 last:mb-0 flex items-center justify-between ${
                                            filterFrequency === f ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                                        }`}
                                    >
                                        {f}
                                        {filterFrequency === f && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── MAIN TABLE CARD ── */}
            <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-indigo-200/20 border border-white overflow-hidden mb-8 min-h-[500px] flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#fbfcff]/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-indigo-50/50">
                            <tr>
                                <th className="px-6 py-5">ID</th>
                                <th className="px-10 py-5">Template</th>
                                <th className="px-8 py-5">Assigned By</th>
                                <th className="px-8 py-5">Frequency</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-10 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-50/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : filteredTemplates.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 italic font-medium uppercase tracking-[0.2em] text-[10px]">No matches found for active filters.</td>
                                </tr>
                            ) : (
                                filteredTemplates.map((t) => {
                                    const id = t.id || t.recurring_id;
                                    // Handle both `status: 'ACTIVE'` and `active: true` from backend
                                    const isActive = t.status === 'ACTIVE' || t.active === true;
                                    const isSelected = selectedTemplateId === id;
                                    return (
                                        <React.Fragment key={id}>
                                            <tr 
                                                onClick={() => {
                                                    setSelectedTemplateId(id);
                                                    setExpandedRowId(expandedRowId === id ? null : id);
                                                }}
                                                className={`group cursor-pointer transition-all duration-300 ${isSelected ? 'bg-indigo-100/40' : 'hover:bg-white/60'}`}
                                            >
                                                {/* ID Badge Column */}
                                                <td className="px-6 py-5">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black font-mono tracking-widest shadow-sm">
                                                        RT-{t.id || t.recurring_id}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`transition-transform duration-300 ${expandedRowId === id ? 'rotate-90' : ''}`}>
                                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`text-[15px] font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'} tracking-tight`}>
                                                                {t.title}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-bold text-slate-700">{t.assigned_by_name || 'System Admin'}</span>
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Executor</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-[13px] font-bold text-slate-500">{formatFrequency(t)}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                                                        isActive 
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                            : 'bg-orange-50 text-orange-600 border-orange-100'
                                                    }`}>
                                                        {isActive ? <Check size={12} strokeWidth={4} /> : <Pause size={12} strokeWidth={4} />}
                                                        {isActive ? 'Active' : 'Inactive'}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-5 text-right relative" onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                        onClick={() => setRowMenuId(rowMenuId === id ? null : id)}
                                                        className={`p-2.5 rounded-xl transition-all shadow-sm ${rowMenuId === id ? 'bg-indigo-600 text-white shadow-indigo-200' : 'text-slate-400 group-hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                    >
                                                        <MoreHorizontal size={20} strokeWidth={3} />
                                                    </button>
                                                    
                                                    {rowMenuId === id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setRowMenuId(null)} />
                                                            <div className="absolute top-full right-10 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                                                <button 
                                                                    onClick={() => { handleToggleStatus(t); setRowMenuId(null); }}
                                                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all mb-0.5 flex items-center gap-3 ${
                                                                        isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                                                                    }`}
                                                                >
                                                                    {actionLoading === id ? <Loader2 size={14} className="animate-spin" /> : (isActive ? <Pause size={14} /> : <Play size={14} />)}
                                                                    {isActive ? 'Pause Task' : 'Activate Task'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => { setConfigModal({ isOpen: true, template: t }); setRowMenuId(null); }}
                                                                    className="w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all mb-0.5 flex items-center gap-3"
                                                                >
                                                                    <Settings size={14} />
                                                                    Configure
                                                                </button>
                                                                <div className="h-px bg-slate-50 my-1 mx-2" />
                                                                <button 
                                                                    onClick={() => { handleDelete(t); setRowMenuId(null); }}
                                                                    className="w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black text-rose-600 uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center gap-3"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                            {expandedRowId === id && (
                                                <tr className="bg-slate-50/50">
                                                    <td colSpan={6} className="px-10 py-6 border-b border-indigo-100/30 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            <div className="space-y-4">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                    <Info size={12} className="text-indigo-400" />
                                                                    Automation Summary
                                                                </h4>
                                                                <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                                                                    {t.description || "No description provided."}
                                                                </p>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                    <ListTodo size={12} className="text-emerald-400" />
                                                                    Subtask Templates ({t.subtasks?.length || 0})
                                                                </h4>
                                                                <div className="space-y-2">
                                                                    {t.subtasks?.length > 0 ? (
                                                                        t.subtasks.map((st, sidx) => (
                                                                            <div key={sidx} className="flex items-start px-4 py-3 bg-white rounded-xl border border-slate-100 shadow-sm transition-colors hover:shadow-md gap-3">
                                                                                {/* Subtask ID Badge */}
                                                                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-md text-[9px] font-black font-mono tracking-widest mt-0.5">
                                                                                    SR-{st.id || st.subtask_template_id || st.subtask_id}
                                                                                </span>
                                                                                <div className="flex flex-col flex-1 min-w-0">
                                                                                    <span className="text-[12px] font-bold text-slate-700 leading-snug">{st.title}</span>
                                                                                    {st.description && (
                                                                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed border-l-2 border-indigo-100 pl-2">
                                                                                            {st.description}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                                <span className="ml-auto shrink-0 text-[9px] font-black text-slate-300 uppercase tracking-widest self-center">{st.priority}</span>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-[11px] text-slate-400 italic py-2">No subtask templates found. Click Configure to add some.</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination placeholder */}
                <div className="bg-indigo-50/10 px-10 py-4 border-t border-indigo-50/30 flex justify-center items-center gap-4">
                    <button className="text-[12px] font-bold text-slate-400 hover:text-indigo-600">&lt; Prev</button>
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shadow-sm shadow-indigo-100">1</span>
                    <button className="text-[12px] font-bold text-slate-400 hover:text-indigo-600">Next &gt;</button>
                </div>
            </div>

            {/* ── SELECTION DETAILS SECTION ── */}
            {selectedTemplate && (
                <div className="animate-in slide-in-from-bottom-6 duration-700">
                    <h2 className="text-[14px] font-black text-slate-500 mb-6 flex items-center gap-3 flex-wrap">
                        Selected Template:
                        <span className="text-indigo-600 uppercase tracking-tight">{selectedTemplate.title}</span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black font-mono tracking-widest shadow-sm">
                            RT-{selectedTemplate.id || selectedTemplate.recurring_id}
                        </span>
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Template Info Card */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-xl p-10 flex flex-col h-full">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                    <Info size={20} />
                                </div>
                                <h3 className="text-[18px] font-black text-slate-800">Template Info</h3>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid grid-cols-1 gap-1">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Template ID</label>
                                        <p className="text-[15px] font-black text-indigo-600 font-mono">RT-{selectedTemplate.id || selectedTemplate.recurring_id}</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Frequency</label>
                                        <p className="text-[15px] font-bold text-slate-700">{formatFrequency(selectedTemplate)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                                    {selectedTemplate.description ? (
                                        <ul className="space-y-3">
                                            {selectedTemplate.description.split('\n').filter(l => l.trim()).map((line, i) => (
                                                <li key={i} className="flex gap-3 text-slate-600 text-[14px] leading-relaxed group">
                                                    <CheckCircle2 size={16} className="text-indigo-400 shrink-0 mt-0.5 group-hover:text-indigo-600 transition-colors" />
                                                    {line.trim()}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-[14px] text-slate-400 italic">No detailed description provided for this automation.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recurring Subtasks Card */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-xl p-10 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                        <ListTodo size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-[18px] font-black text-slate-800">Recurring Subtasks</h3>
                                        <span className="text-[10px] font-black text-slate-400 font-mono tracking-widest mt-0.5">
                                            Parent: RT-{selectedTemplate.id || selectedTemplate.recurring_id}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setConfigModal({ isOpen: true, template: selectedTemplate })}
                                    className="w-8 h-8 rounded-full border border-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                                    title="Add Subtask"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div className="space-y-3 flex-1">
                                {selectedTemplate.subtasks?.length > 0 ? (
                                    selectedTemplate.subtasks.map((st, i) => (
                                        <div key={i} className="group p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-indigo-100">
                                            {/* ID badges row */}
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-md text-[9px] font-black font-mono tracking-widest">
                                                    SR-{st.id || st.subtask_template_id || st.subtask_id || (i + 1)}
                                                </span>
                                                <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-400 rounded-md text-[9px] font-black font-mono tracking-widest">
                                                    RT-{selectedTemplate.id || selectedTemplate.recurring_id}
                                                </span>
                                            </div>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className="w-5 h-5 rounded border-2 border-indigo-200 bg-indigo-50 flex items-center justify-center shadow-inner shrink-0 mt-0.5">
                                                        <Check size={14} className="text-indigo-600" strokeWidth={3} />
                                                    </div>
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <span className="text-[14px] font-bold text-slate-700 tracking-tight group-hover:text-indigo-600 transition-colors leading-snug">{st.title}</span>
                                                        {st.description && (
                                                            <p className="text-[12px] text-slate-400 font-medium italic leading-snug line-clamp-2">{st.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{formatFrequency(selectedTemplate)}</span>
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={() => setConfigModal({ isOpen: true, template: selectedTemplate })}
                                                            className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                            title="Edit Subtask"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => setConfigModal({ isOpen: true, template: selectedTemplate })}
                                                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                            title="Delete Subtask"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-60 italic text-center gap-3">
                                        <ListTodo size={32} strokeWidth={1} />
                                        <p className="text-sm">No subtask templates attached.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AutomationConfigModal 
                isOpen={configModal.isOpen}
                onClose={() => setConfigModal({ isOpen: false, template: null })}
                template={configModal.template}
                onSave={(updated) => {
                    const uid = updated.id || updated.recurring_id;
                    setTemplates(prev => {
                        const exists = prev.find(t => (t.id || t.recurring_id) === uid);
                        if (exists) {
                            return prev.map(t => (t.id || t.recurring_id) === uid ? { ...t, ...updated } : t);
                        }
                        return [updated, ...prev];
                    });
                    if (uid) {
                        setSelectedTemplateId(uid);
                        fetchSubtasks(uid); // Re-fetch to ensure subtasks are synced
                    }
                }}
            />
        </div>
    );
};

export default RecurringTasksPage;
