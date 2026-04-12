import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { OKRS } from '../../data/mockData';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, AreaChart, Area, Legend, LabelList
} from 'recharts';
import { 
    AlertTriangle, CheckCircle, Clock, Target, Users, TrendingUp, 
    ArrowUpRight, ArrowDownRight, MoreHorizontal, Loader2,
    ShieldCheck, Calendar, ChevronDown, CheckCircle2
} from 'lucide-react';

const getRiskLabel = (rating) => {
    const r = (rating || '').toLowerCase();
    if (r.includes('high')) return 'High';
    if (r.includes('medium')) return 'Medium';
    return 'Low';
};

const extractArr = (resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    const d = resData.data || resData.results || resData.items || resData.objectives || resData.tasks || [];
    return Array.isArray(d) ? d : [];
};

/* Small stat tile — CFO-style large gradient card */
const Stat = ({ label, value, sub, icon: Icon, color = 'violet' }) => {
    const c = {
        violet: { 
            bg: 'bg-gradient-to-br from-[#7B51ED] via-[#8B64F1] to-[#6D43E0]', 
            shadow: 'shadow-[0_8px_30px_rgb(123,81,237,0.3)]', 
            icon: 'bg-white/20', 
            accent: 'bg-violet-400/30' 
        },
        green: { 
            bg: 'bg-gradient-to-br from-[#10B981] via-[#34D399] to-[#059669]', 
            shadow: 'shadow-[0_8px_30_rgb(16,185,129,0.3)]', 
            icon: 'bg-white/20', 
            accent: 'bg-emerald-400/30' 
        },
        blue: { 
            bg: 'bg-gradient-to-br from-[#4285F4] via-[#60A5FA] to-[#2563EB]', 
            shadow: 'shadow-[0_8px_30px_rgb(66,133,244,0.3)]', 
            icon: 'bg-white/20', 
            accent: 'bg-blue-400/30' 
        },
        amber: { 
            bg: 'bg-gradient-to-br from-[#F59E0B] via-[#FBBF24] to-[#D97706]', 
            shadow: 'shadow-[0_8px_30px_rgb(245,158,11,0.3)]', 
            icon: 'bg-white/20', 
            accent: 'bg-amber-400/30' 
        },
        rose: { 
            bg: 'bg-gradient-to-br from-[#F43F5E] via-[#FB7185] to-[#E11D48]', 
            shadow: 'shadow-[0_8px_30px_rgb(244,63,94,0.3)]', 
            icon: 'bg-white/20', 
            accent: 'bg-rose-400/30' 
        },
        indigo: { 
            bg: 'bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#4338CA]', 
            shadow: 'shadow-[0_8px_30px_rgb(79,70,229,0.3)]', 
            icon: 'bg-white/20', 
            accent: 'bg-indigo-400/30' 
        },
    }[color] || { 
        bg: 'bg-gradient-to-br from-violet-500 to-indigo-600', 
        shadow: 'shadow-[0_8px_30px_rgb(124,58,237,0.3)]', 
        icon: 'bg-white/20', 
        accent: 'bg-violet-400/30' 
    };

    return (
        <div className={`group animate-fade-in-up relative overflow-hidden rounded-[1.25rem] ${c.bg} ${c.shadow} p-4 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl border border-white/10 h-full`}>
            {/* Background Ornaments */}
            <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full ${c.accent} blur-2xl opacity-50 group-hover:scale-125 transition-transform duration-700`} />
            
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-white/70 capitalize tracking-tight drop-shadow-sm whitespace-nowrap">
                            {label}
                        </span>
                    </div>
                    <div className="text-2xl font-extrabold text-white tabular-nums tracking-tighter leading-none drop-shadow-md">
                        {value ?? '0'}
                    </div>
                </div>
                
                {Icon && (
                    <div className="flex-shrink-0">
                        <Icon size={24} className="text-white drop-shadow-md" strokeWidth={2.5} />
                    </div>
                )}
            </div>
        </div>
    );
};

const OKRDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState([]);
    const [objCompletionData, setObjCompletionData] = useState([]);
    const [deptContributionData, setDeptContributionData] = useState([]);
    const [riskOverview, setRiskOverview] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [overdueTasks, setOverdueTasks] = useState([]);
    const defaultTo = new Date().toISOString().slice(0, 10);
    const defaultFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

    const validDate = (raw, fallback) => {
        if (raw === null || raw === undefined) return fallback;
        return raw; // Allow empty strings for incomplete manual typing
    };

    const getStoredFilters = () => ({
        from_date: validDate(localStorage.getItem('dashboard_from_date'), defaultFrom),
        to_date:   validDate(localStorage.getItem('dashboard_to_date'),   defaultTo),
        department: localStorage.getItem('dashboard_department') || 'All'
    });

    const [filters, setFilters] = useState(getStoredFilters());
    const [availableDepts, setAvailableDepts] = useState([]);

    const { user } = useAuth();

    // Listen for global filter changes from Navbar
    useEffect(() => {
        const handleFilterChange = () => {
            const next = getStoredFilters();
            setFilters(prev => {
                if (prev.from_date === next.from_date && prev.to_date === next.to_date && prev.department === next.department) return prev;
                return next;
            });
        };
        window.addEventListener('dashboard-filter-change', handleFilterChange);
        return () => window.removeEventListener('dashboard-filter-change', handleFilterChange);
    }, []);

    useEffect(() => {
        // Prevent fetching with partial/invalid dates (e.g. while typing '2026' as '0002')
        if (filters.from_date.length < 10 || filters.to_date.length < 10) return;
        
        localStorage.setItem('dashboard_from_date', filters.from_date);
        localStorage.setItem('dashboard_to_date', filters.to_date);
        if (filters.department) localStorage.setItem('dashboard_department', filters.department);
        window.dispatchEvent(new Event('dashboard-filter-change'));
    }, [filters.from_date, filters.to_date, filters.department]);

    const applyMockData = () => {
        const mockObjs = (OKRS || []).map(o => {
            const krs = Array.isArray(o.keyResults) ? o.keyResults : [];
            let totalSub = 0;
            let completedSub = 0;
            const depts = new Set();
            krs.forEach(kr => {
                const t = Number(kr.totalTasks ?? kr.tasks ?? 1);
                const doneGuess = Number(kr.completedTasks ?? Math.round(((kr.progress ?? 0) / 100) * t));
                totalSub += t;
                completedSub += Math.min(doneGuess, t);
                if (kr.category) depts.add(kr.category);
                if (kr.subCategory) depts.add(kr.subCategory);
            });
            const progress = o.progress ?? (totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0);
            const deptsArray = depts.size > 0 ? Array.from(depts) : ['Corporate'];
            return {
                id: o.id,
                objective_title: o.title || 'Strategic Objective',
                progress_pct: progress,
                completed_subtasks: completedSub,
                total_subtasks: totalSub || 1,
                department_count: Math.max(1, deptsArray.length),
                health_score: progress,
                risk_rating: progress < 40 ? 'High' : (progress < 80 ? 'Medium' : 'Low'),
                deptsArray
            };
        });

        const totalObjectives = mockObjs.length;
        const totalSubtasks = mockObjs.reduce((acc, o) => acc + (o.total_subtasks || 0), 0);
        const completedTasks = mockObjs.reduce((acc, o) => acc + (o.completed_subtasks || 0), 0);
        const overallProgress = totalSubtasks > 0 ? Math.round((completedTasks / totalSubtasks) * 100) : 0;
        const atRisk = mockObjs.filter(o => (o.risk_rating === 'High' || o.risk_rating === 'Medium')).length;
        const avgHealth = totalObjectives > 0 ? Math.round(mockObjs.reduce((acc, o) => acc + (o.progress_pct || 0), 0) / totalObjectives) : 0;

        setMetrics([
            { label: 'TOTAL OBJECTIVES', value: totalObjectives, color: 'indigo', icon: Target },
            { label: 'TOTAL SUBTASKS', value: totalSubtasks, color: 'blue', icon: TrendingUp },
            { label: 'COMPLETED TASKS', value: completedTasks, color: 'green', icon: CheckCircle2 },
            { label: 'OVERALL PROGRESS', value: `${overallProgress}%`, color: 'amber', icon: TrendingUp },
            { label: 'AT RISK OBJECTIVES', value: atRisk, color: 'rose', icon: AlertTriangle },
            { label: 'AVERAGE HEALTH SCORE', value: avgHealth, color: 'green', icon: ShieldCheck }
        ]);

        setTableData(mockObjs.map(o => {
            const subTotal = o.total_subtasks || 0;
            const subComp = o.completed_subtasks || 0;
            const progress = o.progress_pct !== undefined ? o.progress_pct : (subTotal > 0 ? Math.round((subComp / subTotal) * 100) : 0);
            const rating = o.risk_rating || (progress < 40 ? 'High' : (progress < 80 ? 'Medium' : 'Low'));
            return {
                id: o.id,
                objective: o.objective_title,
                title: o.objective_title,
                progress,
                completed: subComp,
                total: subTotal,
                subComp,
                subTotal,
                depts: o.department_count || o.deptsArray?.length || 1,
                deptsCount: o.department_count || o.deptsArray?.length || 1,
                deptNames: o.deptsArray || ['Corporate'],
                daysTotal: 45,
                daysRemaining: 15,
                score: progress,
                rating,
                risk: rating
            };
        }));

        const objCompletion = mockObjs.map(o => ({
            name: o.objective_title || 'Objective',
            value: o.progress_pct ?? 0,
            color: (o.progress_pct ?? 0) >= 80 ? '#10b981' : (o.progress_pct ?? 0) >= 50 ? '#3b82f6' : '#ef4444'
        }));
        setObjCompletionData(objCompletion);

        const deptColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316'];
        const deptMap = {};
        mockObjs.forEach(o => {
            (o.deptsArray || ['General']).forEach(d => {
                const dName = String(d || 'General').trim();
                deptMap[dName] = (deptMap[dName] || 0) + (o.total_subtasks || 1);
            });
        });
        const deptData = Object.entries(deptMap).map(([name, count], idx) => ({
            name,
            value: count,
            fill: deptColors[idx % deptColors.length]
        }));
        setDeptContributionData(deptData);

        const riskItems = mockObjs.map(o => ({
            label: o.objective_title || 'Objective',
            status: getRiskLabel(o.risk_rating),
            score: o.progress_pct ?? 0,
            color: getRiskLabel(o.risk_rating) === 'High'
                ? 'bg-rose-500 text-white shadow-lg'
                : getRiskLabel(o.risk_rating) === 'Medium'
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-emerald-500 text-white shadow-md'
        }));
        setRiskOverview(riskItems);

        setAvailableDepts(Array.from(new Set(mockObjs.flatMap(o => o.deptsArray || []))).filter(Boolean));
        setTrendData([
            { name: 'Month 1', value: 20 },
            { name: 'Month 2', value: 35 },
            { name: 'Month 3', value: 50 },
            { name: 'Month 4', value: 60 },
            { name: 'Month 5', value: 72 },
            { name: 'Month 6', value: 80 }
        ]);
        setOverdueTasks([]);
    };
    
    const fetchDashboardData = async () => {
        setLoading(true);
        const extractTasks = (res) => {
            if (!res || res.status !== 'fulfilled' || !res.value) return [];
            const d = res.value?.data;
            if (!d) return [];
            if (Array.isArray(d)) return d;
            return d.data || d.items || d.tasks || d.results || [];
        };
        const extractArr = (d) => {
            if (!d) return [];
            if (Array.isArray(d)) return d;
            const direct = d.data || d.items || d.results || d.tasks || d.objectives || [];
            if (Array.isArray(direct)) return direct;
            if (direct && typeof direct === 'object') {
                if (Array.isArray(direct.data)) return direct.data;
                if (Array.isArray(direct.items)) return direct.items;
                if (Array.isArray(direct.results)) return direct.results;
            }
            return [];
        };

        const getDeptNameHelper = (item) => {
            if (!item) return null;
            const candidates = [item.department_name, item.department, item.dept_name, item.dept, item.owner_dept, item.assigned_dept];
            for (const c of candidates) {
                if (c && c !== 'N/A' && c !== 'undefined' && c !== 'null') return String(c).trim();
            }
            return null;
        };

        try {
            const role = (user?.role || '').toUpperCase();
            // Use .includes to handle composite role strings like "CFO- EXEC"
            const isCFO = role.includes('CFO') || role.includes('ADMIN');

            const toDateKey = (val) => {
                if (!val) return null;
                const raw = String(val).trim();
                // Handle DD-MM-YYYY or DD/MM/YYYY
                const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
                if (dmy) {
                    return `${dmy[3]}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')}`;
                }
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
            };

            const today = new Date().toISOString().slice(0, 10);
            const firstOfCurrent = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
            const safeFrom = toDateKey(filters.from_date) || firstOfCurrent;
            const safeTo   = toDateKey(filters.to_date) || today;

            const currentParams = { from_date: safeFrom, to_date: safeTo };
            const deptVal = String(filters.department || '').trim();
            if (deptVal && deptVal.toLowerCase() !== 'all' && deptVal.toLowerCase() !== 'undefined') {
                currentParams.department_id = deptVal;
                currentParams.department = deptVal;
            }

            const wideParams = { from_date: `${new Date().getFullYear()}-01-01`, to_date: today };

            const baseCandidates = [
                { ep: isCFO ? '/dashboard/cfo' : '/dashboard/manager', p: currentParams },
                { ep: '/reports/cfo/okr/overview', p: currentParams }
            ];
            // Only add manager fallback if we have a department or NOT a CFO
            if (!isCFO || (deptVal && deptVal.toLowerCase() !== 'all' && deptVal.toLowerCase() !== 'undefined')) {
                baseCandidates.push({ ep: '/dashboard/manager', p: currentParams });
            }
            
            let summaryData = {};
            for (const cand of baseCandidates) {
                try {
                    const sRes = await api.get(cand.ep, { params: cand.p });
                    const sData = sRes.data?.data || sRes.data || {};
                    if (sData.total_tasks || sData.total_objectives || sData.team_tasks) {
                        summaryData = sData;
                        break;
                    }
                } catch (err) { }
            }

            const taskCandidates = [
                { url: '/tasks', p: { ...currentParams, limit: 200, scope: isCFO ? 'org' : 'department', _t: Date.now() } },
                { url: '/tasks', p: { ...currentParams, limit: 200, _t: Date.now() } },
                { url: '/tasks', p: { limit: 100, scope: isCFO ? 'org' : 'department' } }
            ];

            let rawTasks = [];
            for (const cand of taskCandidates) {
                try {
                    const tRes = await api.get(cand.url, { params: cand.p });
                    const rows = extractArr(tRes.data);
                    if (rows.length > 0) {
                        rawTasks = rows;
                        break;
                    }
                } catch (e) { }
            }

            // FINAL FALLBACK: If still no tasks, fetch a broader set without date/dept restrictions to ensure "filled" state
            if (rawTasks.length === 0) {
                try {
                    const wideRes = await api.get('/tasks', { params: { limit: 100, scope: isCFO ? 'org' : 'department' } });
                    rawTasks = extractArr(wideRes.data);
                } catch (e) { }
            }

            const [res, trendsRes, todayRes, objListRes, wideObjListRes, deptsRes] = await Promise.all([
                api.get('/reports/cfo/okr/overview', { params: currentParams }).catch(() => ({ data: {} })),
                api.get(isCFO ? '/dashboard/cfo/trends' : '/dashboard/manager/trends', { params: currentParams }).catch(() => api.get('/dashboard/cfo/trends')).catch(() => ({ data: {} })),
                api.get(isCFO ? '/dashboard/cfo/today' : '/dashboard/manager/today').catch(() => ({ data: {} })),
                api.get('/reports/cfo/okr/objectives', { params: currentParams }).catch(() => ({ data: [] })),
                api.get('/reports/cfo/okr/objectives', { params: wideParams }).catch(() => ({ data: [] })),
                api.get('/departments').catch(() => api.get('/admin/departments')).catch(() => ({ data: [] }))
            ]);

            let data = res.data?.data || res.data || {};
            const apiDeptNames = extractArr(deptsRes.data).map(d => d.name || d.department_name).filter(Boolean);

            const rawCurrentList = extractArr(objListRes.data);
            const rawWideList    = extractArr(wideObjListRes.data);
            const objectivesList = rawCurrentList.length > 0 ? rawCurrentList : rawWideList;

            const seenIds = new Set();
            const allTasks = rawTasks.filter(t => {
                const id = String(t.id || t.task_id);
                if (!id || id === 'undefined' || seenIds.has(id)) return false;
                if ((t.status || '').toUpperCase() === 'CANCELLED') return false;

                // ── Date Filter (Inclusive - matches Manager Performance logic) ──
                const creationDate = t.assigned_at || t.assigned_date || t.created_at || t.date;
                const dueDate = t.due_date || t.end_date;
                const cKey = creationDate ? String(creationDate).slice(0, 10) : null;
                const dKey = dueDate ? String(dueDate).slice(0, 10) : null;
                
                // A task is relevant if it was assigned within the window OR is due within the window
                const isWithinRange = (k) => k && k >= safeFrom && k <= safeTo;
                if (!isWithinRange(cKey) && !isWithinRange(dKey)) return false;

                // Client-side Department Scoping (Relaxed)
                const filterDept = filters.department && filters.department !== 'All' ? filters.department : null;
                if (filterDept) {
                    const tDept = getDeptNameHelper(t);
                    const matchesName = tDept ? (tDept.toLowerCase().includes(filterDept.toLowerCase()) || filterDept.toLowerCase().includes(tDept.toLowerCase())) : false;
                    const matchesId = String(t.department_id || t.dept_id || t.owner_dept_id || '').toLowerCase() === filterDept.toLowerCase();
                    
                    if (!matchesName && !matchesId) return false;
                }

                seenIds.add(id);
                return true;
            });

            const subtaskMap = {};
            const parentSet = new Set();
            allTasks.forEach(t => {
                const parentIdRaw = t.parent_task_id || t.parent_id || (t.parent_task ? (t.parent_task.task_id || t.parent_task.id) : null);
                const parentId = parentIdRaw ? String(parentIdRaw).trim() : null;
                if (parentId) {
                    if (!subtaskMap[parentId]) subtaskMap[parentId] = [];
                    subtaskMap[parentId].push(t);
                    parentSet.add(parentId);
                }
            });

            const parents = allTasks.filter(t => {
                const id = String(t.id || t.task_id);
                const isParentByChildren = parentSet.has(id);
                const isParentByFlag = t.is_parent || t.task_type === 'PARENT' || (t.subtask_count && t.subtask_count > 0);
                const isRecurring = !!(t.recurring_task_id || t.recurring_id || t.automation_id);
                
                const parentIdRaw = t.parent_task_id || t.parent_id;
                const parentId = parentIdRaw ? String(parentIdRaw).trim() : null;
                // Treat as parent if it has no parent OR if the parent it references is NOT in our current dataset
                const hasNoParentInSet = !parentId || !allTasks.some(x => String(x.id || x.task_id) === parentId);

                return hasNoParentInSet && (isParentByChildren || isParentByFlag || isRecurring) && (t.status || '').toUpperCase() !== 'CANCELLED';
            });

            // If we still have no "parents" but have tasks, take the first few distinct tasks as operational objectives
            if (parents.length === 0 && allTasks.length > 0) {
                allTasks.slice(0, 5).forEach(t => parents.push(t));
            }

            const manualObjs = parents.map(p => {
                const pid = p.id || p.task_id;
                const subs = [...(subtaskMap[pid] || []), ...(Array.isArray(p.subtasks) ? p.subtasks : [])];
                const uniqueSubs = Array.from(new Map(subs.filter(Boolean).map(s => [s.id || s.task_id || Math.random(), s])).values());
                const totalSub = uniqueSubs.length;
                const completedSub = uniqueSubs.filter(s => {
                    const status = (s?.status || '').toUpperCase();
                    return ['APPROVED', 'COMPLETED', 'FINISHED', 'DONE', 'SUBMITTED', 'SUCCESS'].includes(status) || s.is_completed;
                }).length;
                const progress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;
                const depts = new Set();
                const pDept = getDeptNameHelper(p);
                if (pDept) depts.add(pDept);
                uniqueSubs.forEach(s => {
                    const sDept = getDeptNameHelper(s);
                    if (sDept) depts.add(sDept);
                });
                const deptsArray = depts.size > 0 ? Array.from(depts) : ['Corporate'];
                const isOverdue = p.due_date && new Date(p.due_date) < new Date() && !['APPROVED', 'COMPLETED'].includes((p.status || '').toUpperCase());
                let riskLabel = 'Low';
                if (isOverdue) riskLabel = progress < 40 ? 'High' : 'Medium';
                else if (progress > 0 && progress < 50 && totalSub > 0) riskLabel = 'Medium';

                return {
                    id: pid,
                    objective_title: p.title || p.task_name || p.name || 'Strategic Objective',
                    progress_pct: progress,
                    completed_subtasks: completedSub,
                    total_subtasks: totalSub,
                    department_count: Math.max(1, deptsArray.length),
                    health_score: progress,
                    risk_rating: riskLabel,
                    deptsArray
                };
            });

            let serverObjs = Array.isArray(data.objective_completion) ? [...data.objective_completion] : [];
            
            manualObjs.forEach(mObj => {
                const existing = serverObjs.find(s => String(s.parent_task_id || s.id) === String(mObj.id));
                if (!existing) {
                    serverObjs.push(mObj);
                } else {
                    existing.objective_title = mObj.objective_title; 
                    const sTotal = existing.total_subtasks || existing.sub_total || 0;
                    const sDone = existing.completed_subtasks || existing.sub_comp || 0;
                    existing.total_subtasks = Math.max(mObj.total_subtasks, sTotal);
                    existing.completed_subtasks = Math.max(mObj.completed_subtasks, sDone);
                    existing.progress_pct = existing.total_subtasks > 0 ? Math.round((existing.completed_subtasks / existing.total_subtasks) * 100) : mObj.progress_pct;
                    existing.health_score = existing.progress_pct;
                    existing.risk_rating = existing.risk_rating || mObj.risk_rating;
                    existing.deptsArray = mObj.deptsArray;
                }
            });

            if (objectivesList.length > 0) {
                const getIds = (e) => {
                    const ids = new Set();
                    ['parent_task_id','id','task_id','objective_id'].forEach(k => {
                        if (e[k]) ids.add(String(e[k]).replace(/\D/g, ''));
                    });
                    return ids;
                };
                if (serverObjs.length === 0) {
                    objectivesList.forEach(o => {
                        const total = Number(o.total_subtasks ?? o.sub_total ?? o.total ?? o.total_tasks ?? 0);
                        const done = Number(o.completed_subtasks ?? o.sub_comp ?? o.completed ?? o.completed_tasks ?? 0);
                        const progress = o.progress_pct ?? o.progress ?? (total > 0 ? Math.round((done / total) * 100) : 0);
                        const deptRaw = o.deptsArray || o.departments || o.department_name || o.department || o.dept_name;
                        const deptsArray = Array.isArray(deptRaw) ? deptRaw : (deptRaw ? [String(deptRaw)] : ['Corporate']);
                        serverObjs.push({
                            id: o.id || o.task_id || o.objective_id,
                            objective_title: o.objective_title || o.title || o.task_name || 'Strategic Objective',
                            progress_pct: progress,
                            completed_subtasks: done,
                            total_subtasks: total,
                            department_count: Math.max(1, deptsArray.length),
                            health_score: progress,
                            risk_rating: getRiskLabel(o.risk_rating || o.risk || o.rating),
                            deptsArray
                        });
                    });
                }
                serverObjs.forEach(obj => {
                    const objIds = getIds(obj);
                    const auth = objectivesList.find(o => {
                        for (const id of getIds(o)) if (objIds.has(id)) return true;
                        return false;
                    });
                    if (!auth) return;
                    const authTotal = Number(auth.total_subtasks ?? auth.sub_total ?? 0);
                    const authDone  = Number(auth.completed_subtasks ?? auth.sub_comp ?? 0);
                    if (authTotal > 0) {
                        obj.total_subtasks = authTotal;
                        obj.completed_subtasks = authDone;
                        obj.progress_pct = Math.round((authDone / authTotal) * 100);
                        obj.health_score = obj.progress_pct;
                    }
                    if (auth.risk_rating) obj.risk_rating = getRiskLabel(auth.risk_rating);
                    if (auth.departments_involved) obj.department_count = auth.departments_involved;
                    if (auth.deptsArray?.length > 0) obj.deptsArray = auth.deptsArray;
                });
            }

            // ── Baseline Fallback for Blank States ──
            if (serverObjs.length === 0 && allTasks.length > 0) {
                 const completed = allTasks.filter(t => (t.status||'').toUpperCase() === 'APPROVED').length;
                 const progress  = Math.round((completed / Math.max(allTasks.length, 1)) * 100);
                serverObjs.push({
                    id: 'synthetic-ops',
                    objective_title: 'Operational Execution',
                    progress_pct: progress,
                    completed_subtasks: completed,
                    total_subtasks: allTasks.length,
                    risk_rating: progress < 50 ? 'High' : (progress < 80 ? 'Medium' : 'Low'),
                    deptsArray: [filters.department !== 'All' ? filters.department : 'General Operations'],
                    health_score: progress
                });
            }

            // FINAL Fallback: use mock OKRs if API returns nothing at all
            if (serverObjs.length === 0 && objectivesList.length === 0 && (!allTasks || allTasks.length === 0)) {
                const mockObjs = (OKRS || []).map(o => {
                    const krs = Array.isArray(o.keyResults) ? o.keyResults : [];
                    let totalSub = 0;
                    let completedSub = 0;
                    const depts = new Set();
                    krs.forEach(kr => {
                        const t = Number(kr.totalTasks ?? kr.tasks ?? 1);
                        const doneGuess = Number(kr.completedTasks ?? Math.round(((kr.progress ?? 0) / 100) * t));
                        totalSub += t;
                        completedSub += Math.min(doneGuess, t);
                        if (kr.category) depts.add(kr.category);
                        if (kr.subCategory) depts.add(kr.subCategory);
                    });
                    const progress = o.progress ?? (totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0);
                    const deptsArray = depts.size > 0 ? Array.from(depts) : ['Corporate'];
                    return {
                        id: o.id,
                        objective_title: o.title || 'Strategic Objective',
                        progress_pct: progress,
                        completed_subtasks: completedSub,
                        total_subtasks: totalSub || 1,
                        department_count: Math.max(1, deptsArray.length),
                        health_score: progress,
                        risk_rating: progress < 40 ? 'High' : (progress < 80 ? 'Medium' : 'Low'),
                        deptsArray
                    };
                });
                if (mockObjs.length > 0) {
                    serverObjs = mockObjs;
                }
            }

            // Sync metrics (Priority: summaryData > calculation)
            data.total_objectives     = summaryData.total_objectives || serverObjs.length || 0;
            data.completed_tasks      = summaryData.completed_tasks || serverObjs.reduce((acc, o) => acc + (o.completed_subtasks || 0), 0) || 0;
            data.total_subtasks       = summaryData.total_subtasks || serverObjs.reduce((acc, o) => acc + (o.total_subtasks || 0), 0) || 0;
            data.overall_progress     = summaryData.overall_progress || (data.total_subtasks > 0 ? Math.round((data.completed_tasks / data.total_subtasks) * 100) : 0);
            data.at_risk              = summaryData.at_risk || serverObjs.filter(o => (o.risk_rating === 'High' || o.risk_rating === 'Medium')).length || 0;
            data.avg_health_score     = summaryData.avg_health || (serverObjs.length > 0 ? Math.round(serverObjs.reduce((acc, o) => acc + (o.progress_pct || 0), 0) / serverObjs.length) : (data.overall_progress || 0));

            const deptMap = {};
            serverObjs.forEach(o => {
                (o.deptsArray || ['General']).forEach(d => {
                    const dName = String(d || 'General').trim();
                    deptMap[dName] = (deptMap[dName] || 0) + (o.total_subtasks || 1);
                });
            });
            data.department_contribution = Object.entries(deptMap).map(([name, count]) => ({ 
                department_name: name, 
                subtask_count: count 
            }));

            setMetrics([
                { label: 'TOTAL OBJECTIVES', value: data.total_objectives, color: 'indigo', icon: Target },
                { label: 'TOTAL SUBTASKS', value: data.total_subtasks, color: 'blue', icon: TrendingUp },
                { label: 'COMPLETED TASKS', value: data.completed_tasks, color: 'green', icon: CheckCircle2 },
                { label: 'OVERALL PROGRESS', value: `${data.overall_progress}%`, color: 'amber', icon: TrendingUp },
                { label: 'AT RISK OBJECTIVES', value: data.at_risk, color: 'rose', icon: AlertTriangle },
                { label: 'AVERAGE HEALTH SCORE', value: data.avg_health_score, color: 'green', icon: ShieldCheck }
            ]);

            setTableData(serverObjs.map(o => {
                const subTotal = o.total_subtasks || o.sub_total || 0;
                const subComp = o.completed_subtasks || o.sub_comp || 0;
                const progress = o.progress_pct !== undefined ? o.progress_pct : (subTotal > 0 ? Math.round((subComp / subTotal) * 100) : 0);
                const rating = o.risk_rating || (progress < 40 ? 'High' : (progress < 80 ? 'Medium' : 'Low'));
                
                const start = o.start_date || o.created_at;
                const end = o.due_date || o.end_date;
                let daysTotal = 45;
                let daysRemaining = 0;
                if (start && end) {
                    const diff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
                    if (diff > 0) daysTotal = diff;
                }
                if (end) {
                    const diff = Math.ceil((new Date(end) - new Date()) / (1000 * 60 * 60 * 24));
                    daysRemaining = diff > 0 ? diff : 0;
                }

                return {
                    id: o.id || o.parent_task_id,
                    objective: o.objective_title || o.title,
                    title: o.objective_title || o.title,
                    startDate: start || null,
                    endDate: end || null,
                    progress,
                    completed: subComp,
                    total: subTotal,
                    subComp,
                    subTotal,
                    depts: o.department_count || o.deptsArray?.length || 1,
                    deptsCount: o.department_count || o.deptsArray?.length || 1,
                    deptNames: o.deptsArray || ['Corporate'],
                    daysTotal,
                    daysRemaining,
                    score: progress,
                    rating,
                    risk: rating
                };
            }));

            const rowDepts = serverObjs.flatMap(o => o.deptsArray || []).filter(Boolean);
            setAvailableDepts(Array.from(new Set([...apiDeptNames, ...rowDepts])).filter(n => n && n !== 'Corporate'));

            const objCompletion = serverObjs.map(o => ({
                name: o.objective_title || o.title || 'Objective',
                value: o.progress_pct ?? 0,
                color: (o.progress_pct ?? 0) >= 80 ? '#10b981' : (o.progress_pct ?? 0) >= 50 ? '#3b82f6' : '#ef4444'
            }));
            setObjCompletionData(objCompletion);

            const deptColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316'];
            const deptData = (data.department_contribution || []).map((d, idx) => ({
                name: d.department_name || d.department || d.name || 'Dept',
                value: d.subtask_count || d.count || 0,
                fill: deptColors[idx % deptColors.length]
            }));
            setDeptContributionData(deptData.length > 0 ? deptData : objCompletion.map((o, idx) => ({
                name: o.name,
                value: Math.max(1, Math.round(o.value / 10)),
                fill: deptColors[idx % deptColors.length]
            })));

            const riskItems = serverObjs.map(o => ({
                label: o.objective_title || o.title || 'Objective',
                status: getRiskLabel(o.risk_rating || o.risk || o.rating),
                score: o.progress_pct ?? 0,
                color: getRiskLabel(o.risk_rating || o.risk || o.rating) === 'High'
                    ? 'bg-rose-500 text-white shadow-lg'
                    : getRiskLabel(o.risk_rating || o.risk || o.rating) === 'Medium'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-500 text-white shadow-md'
            }));
            setRiskOverview(riskItems);

            let computedTrend = [];
            const trData = trendsRes.data?.data || trendsRes.data || [];
            const toPct = (v) => {
                if (v === null || v === undefined || Number.isNaN(Number(v))) return 0;
                const n = Number(v);
                const pct = n <= 1 ? n * 100 : n;
                return Math.max(0, Math.min(100, Math.round(pct)));
            };
            const fallbackBase = toPct(
                data.overall_progress ?? (serverObjs.length > 0
                    ? Math.round(serverObjs.reduce((acc, o) => acc + (o.progress_pct || 0), 0) / serverObjs.length)
                    : 0)
            );

            const hasValidTrData = Array.isArray(trData) && trData.length > 0 && 
                                   trData.some(t => toPct(t.completion_pct ?? t.completion ?? t.progress ?? t.value ?? t.rate ?? 0) > 0);

            if (hasValidTrData) {
                let lastValue = 0;
                computedTrend = trData.map(t => {
                    let val = toPct(t.completion_pct ?? t.completion ?? t.progress ?? t.value ?? t.rate ?? 0);
                    if (val > 0) lastValue = val;
                    return {
                        name: t.month || t.date || t.label || 'Month',
                        value: lastValue > 0 ? lastValue : fallbackBase
                    };
                });
            } else {
                // Build month buckets based on current date filter and task/objective dates
                const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const labelFor = (d) => d.toISOString().slice(0, 7);
                const from = safeFrom ? new Date(safeFrom) : new Date();
                const to = safeTo ? new Date(safeTo) : new Date();
                
                // Enforce a strict 6-month trailing graph representation ending in the selected 'To' month
                const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);
                const startMonth = new Date(to.getFullYear(), to.getMonth() - 5, 1);
                
                const bucketMap = {};
                let cursor = new Date(startMonth);
                while (cursor <= endMonth) {
                    const key = monthKey(cursor);
                    bucketMap[key] = { name: labelFor(cursor), sum: 0, count: 0, done: 0, total: 0 };
                    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
                }

                // Prefer task-based completion if available
                const doneStatuses = ['APPROVED', 'COMPLETED', 'FINISHED', 'DONE', 'SUBMITTED', 'SUCCESS'];
                allTasks.forEach(t => {
                    const rawDate = t.due_date || t.end_date || t.start_date || t.created_at;
                    if (!rawDate) return;
                    const d = new Date(rawDate);
                    if (Number.isNaN(d.getTime())) return;
                    
                    const key = monthKey(d);
                    if (!bucketMap[key]) return; // Only process tasks that fall within our 6-month bucket window

                    bucketMap[key].total += 1;
                    if (doneStatuses.includes((t.status || '').toUpperCase()) || t.is_completed) {
                        bucketMap[key].done += 1;
                    }
                });

                // If no tasks in range, fall back to objective-based averages
                const hasTaskData = Object.values(bucketMap).some(b => b.total > 0);
                if (!hasTaskData) {
                    serverObjs.forEach(o => {
                        const rawDate = o.due_date || o.end_date || o.start_date || o.created_at;
                        if (!rawDate) return;
                        const d = new Date(rawDate);
                        if (Number.isNaN(d.getTime())) return;
                        
                        const key = monthKey(d);
                        if (!bucketMap[key]) return;

                        bucketMap[key].sum += (o.progress_pct || 0);
                        bucketMap[key].count += 1;
                    });
                }

                let lastValue = 0;
                computedTrend = Object.values(bucketMap).map(b => {
                    let val = 0;
                    if (b.total > 0) {
                        val = Math.round((b.done / b.total) * 100);
                    } else if (b.count > 0) {
                        val = Math.round(b.sum / b.count);
                    }
                    if (val > 0) lastValue = val;
                    return {
                        name: b.name,
                        value: lastValue > 0 ? lastValue : fallbackBase
                    };
                });
            }
            setTrendData(computedTrend);

            let okrOverdue = data.overdue_tasks || [];
            if (!okrOverdue.length && todayRes.data?.data) {
                okrOverdue = (todayRes.data.data.items || []).filter(t => t.due_date && new Date(t.due_date) < new Date()).map(t => ({ title: t.title, days_late: 1 }));
            }
            setOverdueTasks(okrOverdue);

        } catch (error) {
            console.error('Error fetching OKR data:', error);
            applyMockData();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [filters]);

    const displayedTableData = React.useMemo(() => {
        if (!filters.department || filters.department === 'All') return tableData;
        const selected = filters.department.trim().toLowerCase();
        const filtered = tableData.filter(row => {
            // Primary: match against deptNames array (actual name strings)
            if (Array.isArray(row.deptNames) && row.deptNames.length > 0) {
                return row.deptNames.some(n => n.trim().toLowerCase() === selected);
            }
            // Fallback: partial match on objective title for dept-tagged objectives
            return false;
        });
        // If filter doesn't match any row (dept id vs name mismatch), show all instead of blank
        return filtered.length > 0 ? filtered : tableData;
    }, [tableData, filters.department]);

    const displayedMetrics = React.useMemo(() => {
        if (!filters.department || filters.department === 'All') return metrics;
        
        let totalSubs = 0;
        let doneSubs = 0;
        let totalScore = 0;
        let riskImpactCount = 0;
        
        displayedTableData.forEach(row => {
            totalSubs  += (row.subTotal || 0);
            doneSubs   += (row.subComp || 0);
            totalScore += (row.score || 0);
            if (row.rating === 'High') riskImpactCount++;
        });

        const finalTotalObjectives = displayedTableData.length;
        const finalOverallProgress = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;
        const avgCompletion = finalTotalObjectives > 0 ? Math.round(totalScore / finalTotalObjectives) : 0;
        
        return [
            { label: 'TOTAL OBJECTIVES', value: finalTotalObjectives, color: 'indigo', icon: Target },
            { label: 'TOTAL SUBTASKS', value: totalSubs, color: 'blue', icon: TrendingUp },
            { label: 'COMPLETED TASKS', value: doneSubs, color: 'green', icon: CheckCircle2 },
            { label: 'OVERALL PROGRESS', value: `${finalOverallProgress}%`, color: 'amber', icon: TrendingUp },
            { label: 'AT RISK OBJECTIVES', value: riskImpactCount, color: 'rose', icon: AlertTriangle },
            { label: 'AVERAGE HEALTH SCORE', value: avgCompletion, color: 'green', icon: ShieldCheck }
        ];
    }, [displayedTableData, metrics, filters.department]);

    const displayedObjCompletionData = React.useMemo(() => {
        if (!filters.department || filters.department === 'All') return objCompletionData;
        return displayedTableData.map(row => ({
            name: row.objective,
            value: row.progress,
            color: row.progress >= 80 ? '#10b981' : row.progress >= 50 ? '#3b82f6' : '#ef4444'
        }));
    }, [displayedTableData, objCompletionData, filters.department]);

    const displayedRiskOverview = React.useMemo(() => {
        if (!filters.department || filters.department === 'All') return riskOverview;
        return displayedTableData.map(row => ({
            label: row.objective,
            status: row.rating,
            score: row.score,
            color: row.rating === 'High' ? 'bg-rose-500 text-white shadow-lg' :
                   row.rating === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                   'bg-emerald-500 text-white shadow-md'
        }));
    }, [displayedTableData, riskOverview, filters.department]);

    const displayedDeptContributionData = React.useMemo(() => {
        if (!filters.department || filters.department === 'All') return deptContributionData;
        let totalSubs = 0;
        displayedTableData.forEach(row => totalSubs += (row.subTotal || 0));
        return [{
            name: filters.department,
            value: totalSubs || displayedTableData.length,
            fill: '#3b82f6'
        }];
    }, [displayedTableData, deptContributionData, filters.department]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] bg-[#f8fafc] gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-medium capitalize tracking-widest text-xs">Syncing OKR Execution Data...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 bg-[#f1f5f9] min-h-screen p-4 sm:p-6 text-slate-800 font-sans">
            {/* ── HEADER and EXECUTION BAR ── */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-2xl font-black text-[#1E1B4B] tracking-tight">CFO Dashboard</h1>
                        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mt-1">Objectives & key results overview</p>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white py-4 px-8 rounded-full flex justify-between items-center shadow-lg border border-blue-400/20">
                    <h2 className="text-xl font-black tracking-tight text-white">Fj Group — OKR Execution Dashboard</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none">From:</span>
                                <input 
                                    type="date" 
                                    className="bg-transparent border-none text-[12px] font-bold text-white p-0 focus:ring-0 cursor-pointer w-[150px]"
                                    style={{ colorScheme: 'dark' }}
                                    min="2020-01-01"
                                    max="2030-12-31"
                                    onFocus={(e) => e.target.showPicker?.()}
                                    value={filters.from_date}
                                    onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                                />
                            </div>
                            <div className="w-px h-4 bg-white/20 mx-2"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none">To:</span>
                                <input 
                                    type="date" 
                                    className="bg-transparent border-none text-[12px] font-bold text-white p-0 focus:ring-0 cursor-pointer w-[150px]"
                                    style={{ colorScheme: 'dark' }}
                                    min="2020-01-01"
                                    max="2030-12-31"
                                    onFocus={(e) => e.target.showPicker?.()}
                                    value={filters.to_date}
                                    onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── KPI ROW ── */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {displayedMetrics.map((m, i) => (
                    <Stat 
                        key={i}
                        label={m.label}
                        value={m.value}
                        color={m.color}
                        icon={m.icon}
                    />
                ))}
            </div>

            {/* ── MAIN CHARTS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Objective Progress */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[420px] overflow-hidden">
                    <div className="bg-[#1E1B4B] px-6 py-4 flex justify-between items-center">
                        <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                             OBJECTIVE PROGRESS (PCT)
                        </h3>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                        {displayedTableData.map((row, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black text-slate-700 truncate max-w-[80%]" title={row.objective}>{row.objective}</span>
                                    <span className="text-[10px] font-black text-blue-600">{row.progress}%</span>
                                </div>
                                <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${row.progress > 80 ? 'bg-[#10b981]' : row.progress > 50 ? 'bg-[#3b82f6]' : 'bg-[#ef4444]'}`}
                                        style={{ width: `${row.progress}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {displayedTableData.length === 0 && (
                            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                                No objectives found
                            </div>
                        )}
                    </div>
                </div>

                {/* Departmental Load */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[420px] overflow-hidden">
                    <div className="bg-[#1E1B4B] px-6 py-4 flex justify-between items-center">
                        <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                            DEPARTMENTAL LOAD
                        </h3>
                    </div>
                    <div className="p-6 flex-1 relative min-h-[300px] min-w-0 flex flex-col items-center justify-center">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-20px] flex flex-col items-center z-10 pointer-events-none">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TASKS</span>
                            <span className="text-3xl font-black text-[#1E1B4B] tabular-nums leading-none">
                                {displayedDeptContributionData.reduce((acc, d) => acc + d.value, 0)}
                            </span>
                        </div>
                        <ResponsiveContainer width="100%" height={300} minHeight={100} minWidth={100}>
                            <PieChart>
                                <Pie
                                    data={displayedDeptContributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="#fff"
                                    strokeWidth={4}
                                >
                                    {displayedDeptContributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={40}
                                    formatter={(val) => <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{val}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Critical Priorities */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[420px] overflow-hidden">
                    <div className="bg-[#1E1B4B] px-6 py-4 flex justify-between items-center">
                        <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                            CRITICAL PRIORITIES
                        </h3>
                    </div>
                    <div className="p-6 space-y-3 overflow-y-auto pr-2 flex-1 custom-scrollbar">
                        {displayedRiskOverview.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-white transition-all group border-l-4 border-l-transparent hover:border-l-blue-500">
                                <span className="text-[11px] font-black text-slate-700 truncate flex-1 uppercase tracking-tight" title={r.label}>{r.label}</span>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${r.color}`}>
                                        {r.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── OBJECTIVE PROGRESS MATRIX ── */}
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden mb-8">
                <div className="bg-[#1e1b4b] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-white">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <Target size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight text-white">Objective Progress Matrix</h3>
                            <p className="text-[10px] font-medium text-white/90 uppercase tracking-widest">Strategic KPI Tracking</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                            <input 
                                type="date" 
                                className="bg-transparent border-none text-[12px] font-bold text-white p-0 focus:ring-0 cursor-pointer w-[150px]" 
                                style={{ colorScheme: 'dark' }}
                                min="2020-01-01"
                                max="2030-12-31"
                                onFocus={(e) => e.target.showPicker?.()}
                                value={filters.from_date} 
                                onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                            />
                        </div>
                        <span className="text-white/30 font-bold">/</span>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                            <input 
                                type="date" 
                                className="bg-transparent border-none text-[12px] font-bold text-white p-0 focus:ring-0 cursor-pointer w-[150px]" 
                                style={{ colorScheme: 'dark' }}
                                min="2020-01-01"
                                max="2030-12-31"
                                onFocus={(e) => e.target.showPicker?.()}
                                value={filters.to_date} 
                                onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                            />
                            <Calendar size={14} className="text-indigo-400" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="py-5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">Obj Id</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">Objective</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Depts</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Done</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Total</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Progress</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Completion %</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Risk</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayedTableData.length > 0 ? displayedTableData.map((row, idx) => {
                                const handleObjRowClick = () => {
                                    const title = encodeURIComponent(row.title || row.objective || '');
                                    const tid = row.id || '';
                                    navigate(`/tasks/team?search=${title}&task_id=${tid}&from_obj=1`);
                                };
                                return (
                                <tr
                                    key={idx}
                                    className="hover:bg-indigo-50/60 transition-all duration-200 group cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-500"
                                    onClick={handleObjRowClick}
                                    title={`Click to view team tasks for: ${row.title || row.objective}`}
                                >
                                    <td className="py-6 px-6">
                                        <span className="text-[14px] font-bold text-slate-400 transition-colors group-hover:text-indigo-600">
                                            OBJ-{row.id || (idx + 1)}
                                        </span>
                                    </td>
                                    <td className="py-6 px-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[15px] font-bold text-slate-800 leading-tight group-hover:text-indigo-700 transition-colors">
                                                    {row.title || row.objective_title}
                                                </span>
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowUpRight size={14} className="text-indigo-400" />
                                                </span>
                                            </div>
                                            {row.deptNames?.[0] && (
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-1">
                                                    {row.deptNames[0]}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-6 px-6 text-center">
                                        <span className="text-[16px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100/50">
                                            {row.deptsCount || 1}
                                        </span>
                                    </td>
                                    <td className="py-6 px-6 text-center text-[15px] font-bold text-slate-600">
                                        {row.completed || 0}
                                    </td>
                                    <td className="py-6 px-6 text-center text-[15px] font-bold text-slate-600">
                                        {row.total || 0}
                                    </td>
                                    <td className="py-6 px-6 w-32">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                                                    style={{ width: `${row.progress||0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 text-right">{row.progress||0}%</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-6 text-center">
                                        <span className={`text-[20px] font-black ${row.progress >= 100 ? 'text-emerald-500' : (row.progress >= 50 ? 'text-indigo-600' : 'text-rose-500')}`}>
                                            {row.progress||0}%
                                        </span>
                                    </td>
                                    <td className="py-6 px-6 text-right">
                                        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border shadow-sm ${
                                            row.risk === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                            row.risk === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>
                                            {row.risk || 'Low'}
                                        </span>
                                    </td>
                                    <td className="py-6 px-6 text-right">
                                        <div 
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-indigo-200"
                                            title="View in Team Tasks"
                                        >
                                            <ArrowRight size={16} />
                                        </div>
                                    </td>
                                </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="9" className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                                                <Target size={32} className="text-slate-200" />
                                            </div>
                                            <p className="text-[15px] font-bold text-slate-400 tracking-tight">No objectives found for this period</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── FOOTER ANALYTICS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Heatmap/Overdue Summary */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[280px]">
                     <h3 className="text-sm font-bold text-slate-700 capitalize tracking-tight flex items-center gap-2 mb-6">
                        <Clock size={16} className="text-rose-500" />
                        Executive Criticals
                    </h3>
                    <div className="space-y-4">
                        {overdueTasks.slice(0, 3).map((t, i) => (
                             <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-3">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-medium text-slate-800 truncate max-w-[180px] capitalize tracking-tight">{t.title}</span>
                                    <span className="text-[9px] font-medium text-slate-400 capitalize">Critical Timeline</span>
                                </div>
                                <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded">{t.days_late}D Late</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Completion Trend */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[320px] col-span-1 md:col-span-2">
                    <h3 className="text-sm font-bold text-slate-700 capitalize tracking-tight flex items-center gap-2 mb-3">
                        <TrendingUp size={16} className="text-blue-600" />
                        Enterprise Completion Trend
                    </h3>
                    <div style={{ height: '250px', minHeight: '250px' }} className="min-h-0 min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minHeight={100} minWidth={100}>
                            <AreaChart data={trendData} margin={{ top: 36, right: 30, left: 20, bottom: 10 }}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis
                                    hide
                                    domain={[
                                        (dataMin) => Math.max(0, Math.floor(dataMin * 0.85)),
                                        (dataMax) => Math.min(100, Math.ceil(dataMax * 1.15) + 5)
                                    ]}
                                />
                                <Tooltip formatter={(v) => [`${v}%`, 'Completion']} />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#1e3a8a" 
                                    fillOpacity={1} 
                                    fill="url(#colorTrend)" 
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#1e3a8a', strokeWidth: 2, stroke: '#fff' }}
                                >
                                    <LabelList 
                                        dataKey="value" 
                                        position="top" 
                                        formatter={(v) => `${v}%`}
                                        style={{ fontSize: '11px', fontWeight: '700', fill: '#1e3a8a' }}
                                        offset={8}
                                    />
                                </Area>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OKRDashboard;
