import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${c.icon} backdrop-blur-md flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 border border-white/25 shadow-lg`}>
                        <Icon size={18} className="text-white drop-shadow-md" strokeWidth={2.5} />
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
    const [filters, setFilters] = useState({
        from_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
        to_date: new Date().toISOString().slice(0, 10)
    });

    const { user } = useAuth();
    
    const fetchDashboardData = async () => {
        setLoading(true);
        // Declare extractTasks in outer scope so trend block can access it
        let tasksReq = null, orgTasksReq = null;
        const extractTasks = (res) => {
            if (!res || res.status !== 'fulfilled' || !res.value) return [];
            const d = res.value?.data;
            if (!d) return [];
            if (Array.isArray(d)) return d;
            return d.data || d.items || d.tasks || d.results || [];
        };
        try {
            const role = (user?.role || '').toUpperCase();
            const isAdmin = role === 'ADMIN';

            const [res, trendsRes, todayRes] = await Promise.all([
                isAdmin ? Promise.resolve({ data: {} }) : api.get('/reports/cfo/okr/overview', {
                    params: {
                        from_date: filters.from_date,
                        to_date: filters.to_date
                    }
                }).catch(() => ({ data: {} })),
                isAdmin ? Promise.resolve({ data: {} }) : api.get('/dashboard/cfo/trends').catch(() => ({ data: {} })),
                isAdmin ? Promise.resolve({ data: {} }) : api.get('/dashboard/cfo/today').catch(() => ({ data: {} }))
            ]);
            let data = res.data?.data || res.data || {};

            // ✅ COMPREHENSIVE TASK FETCH - catches recurring-generated tasks + standard tasks
            try {
                // Fetch from all available scopes to ensure recurring-generated tasks are included
                // Using limit: 200 to avoid 422 Unprocessable Entity errors encountered with higher limits
                const settled = await Promise.allSettled([
                    api.get('/tasks', { params: { limit: 200 } }),
                    api.get('/tasks', { params: { limit: 200, scope: 'org' } }),
                    api.get('/tasks', { params: { limit: 200, scope: 'department' } }).catch(() => null)
                ]);
                tasksReq = settled[0];
                orgTasksReq = settled[1];
                const deptTasksReq = settled[2];

                // Merge and deduplicate by task ID
                const rawMerged = [...extractTasks(tasksReq), ...extractTasks(orgTasksReq), ...extractTasks(deptTasksReq)];
                const seenIds = new Set();
                const allTasks = rawMerged.filter(t => {
                    const id = String(t.id || t.task_id);
                    if (!id || id === 'undefined' || seenIds.has(id)) return false;
                    // ✅ EXCLUDE CANCELLED TASKS
                    if ((t.status || '').toUpperCase() === 'CANCELLED') return false;
                    seenIds.add(id);
                    return true;
                });

                // Build parent->subtask map
                const subtaskMap = {};
                const parentSet = new Set();
                const potentialParents = new Map();

                allTasks.forEach(t => {
                    const id = String(t.id || t.task_id);
                    const parentIdRaw = t.parent_task_id || t.parent_id || (t.parent_task ? (t.parent_task.task_id || t.parent_task.id) : null);
                    const parentId = parentIdRaw ? String(parentIdRaw).trim() : null;
                    
                    if (parentId) {
                        if (!subtaskMap[parentId]) subtaskMap[parentId] = [];
                        subtaskMap[parentId].push(t);
                        parentSet.add(parentId);
                    }
                    potentialParents.set(id, t);
                });

                // Identify parent tasks:
                // 1. Tasks that have subtasks referencing them
                // 2. Tasks explicitly flagged as parent
                // 3. Tasks generated from recurring templates (have recurring_task_id)
                const parents = allTasks.filter(t => {
                    const id = String(t.id || t.task_id);
                    const isParentByChildren = parentSet.has(id);
                    const isParentByFlag = t.is_parent || t.task_type === 'PARENT' || (t.subtask_count && t.subtask_count > 0);
                    const isRecurring = !!(t.recurring_task_id || t.recurring_id || t.automation_id);
                    const hasNoParent = !t.parent_task_id && !t.parent_id;
                    // ✅ EXCLUDE CANCELLED OBJECTIVES
                    const notCancelled = (t.status || '').toUpperCase() !== 'CANCELLED';
                    return hasNoParent && (isParentByChildren || isParentByFlag || isRecurring) && notCancelled;
                });

                // Helper: extract department name from any task object
                const getDeptName = (item) => {
                    if (!item) return null;
                    const candidates = [
                        item.department_name,
                        item.department,
                        item.dept_name,
                        item.dept,
                        item.owner_dept,
                        item.assigned_dept,
                        item.department_id ? `Dept-${item.department_id}` : null
                    ];
                    for (const c of candidates) {
                        if (c && c !== 'N/A' && c !== 'undefined' && c !== 'null') {
                            return typeof c === 'object' ? (c.name || JSON.stringify(c)) : String(c).trim();
                        }
                    }
                    return null;
                };

                const manualObjs = parents.map(p => {
                    const pid = p.id || p.task_id;
                    const directSubs = Array.isArray(p.subtasks) ? p.subtasks : [];
                    const subs = [...(subtaskMap[pid] || []), ...directSubs];

                    // Deduplicate subtasks
                    const uniqueSubs = Array.from(
                        new Map(subs.filter(Boolean).map(s => [s.id || s.task_id || Math.random(), s])).values()
                    );

                    const totalSub = uniqueSubs.length;
                    // Robust status check: normalize to uppercase and trim
                    const getNormStatus = (s) => (s?.status || s?.task_status || s?.status_name || s || '').toString().trim().toUpperCase();
                    
                    const completedSub = uniqueSubs.filter(s => {
                        const status = getNormStatus(s);
                        return ['APPROVED', 'COMPLETED', 'FINISHED', 'DONE', 'SUBMITTED'].includes(status) || 
                               s.is_completed === true || s.is_done === true;
                    }).length;

                    const activeSub = uniqueSubs.filter(s => {
                        const status = getNormStatus(s);
                        return ['IN_PROGRESS', 'STARTED', 'IN PROGRESS', 'REWORK'].includes(status);
                    }).length;
                    
                    const progress = totalSub > 0
                        ? Math.round((completedSub / totalSub) * 100)
                        : 0; // Strictly 0 if no subtasks are found. Prevents phantom 100% scores.

                    // Collect all departments from parent + subtasks
                    const depts = new Set();
                    const pDept = getDeptName(p);
                    if (pDept) depts.add(pDept);
                    uniqueSubs.forEach(s => {
                        const sDept = getDeptName(s);
                        if (sDept) depts.add(sDept);
                    });

                    // If still no dept found, use a meaningful fallback
                    const deptsArray = depts.size > 0 ? Array.from(depts) : ['Corporate'];

                    const isOverdue = p.due_date && new Date(p.due_date) < new Date() &&
                        !['APPROVED', 'COMPLETED'].includes((p.status || '').toUpperCase());
                        
                    let riskLabel = 'Low';
                    let score = progress; // Base health strictly on actual progress (0 done = 0 health)
                    
                    if (isOverdue) {
                        riskLabel = progress < 40 ? 'High' : 'Medium';
                    } else if (progress > 0 && progress < 50 && activeSub === 0 && totalSub > 0) {
                        riskLabel = 'Medium';
                    }

                    return {
                        id: pid,
                        objective_title: p.title || p.task_name || p.name || p.objective_title || 'Strategic Objective',
                        progress_pct: progress,
                        completed_subtasks: completedSub,
                        total_subtasks: totalSub,
                        department_count: Math.max(1, deptsArray.length),
                        health_score: Math.max(0, score),
                        risk_rating: riskLabel,
                        deptsArray
                    };
                });

                // Merge manual objectives with server objectives (server is authoritative for existing, manual fills gaps)
                const serverObjs = Array.isArray(data.objective_completion) ? [...data.objective_completion] : [];

                manualObjs.forEach(mObj => {
                    const existing = serverObjs.find(s =>
                        String(s.parent_task_id || s.id) === String(mObj.id)
                    );
                    if (!existing) {
                        serverObjs.push(mObj);
                    } else {
                        // Use the real latest parent task name from the local check
                        existing.objective_title = mObj.objective_title; 
                        
                        // ONLY fallback to local empirical calculations if server is missing data 
                        // The user says the backend is showing the correct values now.
                        if (!existing.department_count || existing.department_count === 0)
                            existing.department_count = mObj.department_count;
                        // Always prefer locally-computed subtask counts — the server often returns 0
                        // because it counts from a cached/derived field that misses recurring tasks.
                        if (mObj.total_subtasks > 0) {
                            existing.total_subtasks = mObj.total_subtasks;
                        } else if (!existing.total_subtasks) {
                            existing.total_subtasks = 0;
                        }
                        if (mObj.completed_subtasks > 0) {
                            existing.completed_subtasks = mObj.completed_subtasks;
                        } else if (!existing.completed_subtasks) {
                            existing.completed_subtasks = 0;
                        }
                        // Recompute progress from the authoritative subtask counts
                        if (existing.total_subtasks > 0) {
                            existing.progress_pct = Math.round((existing.completed_subtasks / existing.total_subtasks) * 100);
                        } else {
                            // If we have 0 locally detected subtasks, force it to 0 or 
                            // fallback ONLY if mObj had a value (which it doesn't here).
                            existing.progress_pct = mObj.progress_pct || 0;
                        }
                        
                        // Force consistency: if Total is 0, progress and health MUST be 0.
                        if (!existing.total_subtasks || existing.total_subtasks === 0) {
                            existing.progress_pct = 0;
                            existing.health_score = 0;
                        } else {
                            // Otherwise update health score to match progress
                            existing.health_score = existing.progress_pct;
                        }
                        
                        // Determine the final health and risk dynamically if server didn't give a good one
                        if (!existing.risk_rating) {
                            existing.risk_rating = mObj.risk_rating || 'Low';
                        }
                        
                        // Per client request: health score of 100 is impossible when 0 tasks are done.
                        // ONLY override when the server sends an impossible value (>=100) with 0/0 subtasks.
                        const doneCount = existing.completed_subtasks ?? 0;
                        const totalCount = existing.total_subtasks ?? 0;
                        if (existing.health_score >= 100 && doneCount === 0 && totalCount === 0) {
                            existing.health_score = 0;
                            existing.progress_pct = 0;
                        } else if (!existing.health_score) {
                            existing.health_score = existing.progress_pct || mObj.progress_pct || 0;
                        }
                            
                        existing.deptsArray = mObj.deptsArray;
                    }
                });

                // Force minimum dept_count=1 and sanitize fallback scores on all server objectives too
                serverObjs.forEach(o => {
                    if (!o.department_count || o.department_count === 0) o.department_count = 1;
                    if (!o.deptsArray) o.deptsArray = ['Corporate'];
                    
                    // Surgical sanitize: only fix impossible values.
                    // Force consistency: if Done=0 and Total=0, Progress and Health must be 0.
                    const oDone = o.completed_subtasks ?? 0;
                    const oTotal = o.total_subtasks ?? 0;
                    if (oTotal === 0) {
                        o.progress_pct = 0;
                        o.health_score = 0;
                    } else if (o.health_score >= 100 && oDone === 0) {
                        // Impossible: Health 100 with zero work done.
                        o.progress_pct = 0;
                        o.health_score = 0;
                    } else if (!o.health_score || o.health_score === 100) {
                        // Inherit from progress if health is missing or defaults to 100
                        o.health_score = o.progress_pct;
                    }
                });

                data.objective_completion = serverObjs;
                data.total_objectives = serverObjs.length;

                // Global KPI recalculation
                data.total_subtasks = serverObjs.reduce((acc, o) => acc + Math.max(o.total_subtasks || 0, 1), 0);
                data.completed_tasks = serverObjs.reduce((acc, o) => {
                    const done = o.completed_subtasks || 0;
                    const total = o.total_subtasks || 0;
                    if (total === 0) return acc + (o.progress_pct >= 100 ? 1 : 0);
                    return acc + done;
                }, 0);
                data.overall_progress = data.total_subtasks > 0
                    ? Math.round((data.completed_tasks / data.total_subtasks) * 100)
                    : 0;
                data.at_risk = serverObjs.filter(o => (o.risk_rating === 'High' || o.risk_rating === 'Medium') && (o.status || '').toUpperCase() !== 'CANCELLED').length;
                data.avg_health_score = serverObjs.length > 0
                    ? Math.round(serverObjs.reduce((acc, o) => acc + (o.health_score || 0), 0) / serverObjs.length)
                    : 0;

                // Rebuild department contribution from actual data
                const deptMap = {};
                serverObjs.forEach(o => {
                    (o.deptsArray || ['Corporate']).forEach(d => {
                        deptMap[d] = (deptMap[d] || 0) + Math.max(o.total_subtasks || 0, 1);
                    });
                });
                data.department_contribution = Object.entries(deptMap)
                    .map(([name, count]) => ({ department_name: name, subtask_count: count }))
                    .sort((a, b) => b.subtask_count - a.subtask_count);

                // Rebuild risk overview
                if (!data.risk_overview || data.risk_overview.length === 0) {
                    data.risk_overview = serverObjs.map(o => ({
                        objective_title: o.objective_title,
                        risk_rating: o.risk_rating,
                        health_score: o.health_score
                    }));
                }

            } catch (fallbackErr) {
                console.warn('OKR Dashboard fallback data compilation failed', fallbackErr);
            }



            setMetrics([
                { label: 'Total Objectives', value: data.total_objectives || 0, color: 'blue', icon: Target },
                { label: 'Total Subtasks', value: data.total_subtasks || 0, color: 'indigo', icon: ShieldCheck },
                { label: 'Completed Tasks', value: data.completed_tasks || 0, color: 'green', icon: CheckCircle2 },
                { label: 'Overall Progress', value: `${data.overall_progress || 0}%`, color: 'amber', icon: TrendingUp },
                { label: 'At Risk Objectives', value: data.at_risk || 0, color: 'rose', icon: AlertTriangle },
                { label: 'Avg Health Score', value: data.avg_health_score || 0, color: 'green', icon: CheckCircle },
            ]);

            setObjCompletionData((data.objective_completion || []).map(obj => ({
                name: obj.objective_title,
                value: obj.progress_pct,
                color: obj.progress_pct >= 80 ? '#10b981' : obj.progress_pct >= 50 ? '#3b82f6' : '#ef4444'
            })));

            const colors = ['#1e3a8a', '#10b981', '#7c3aed', '#f59e0b', '#ef4444'];
            setDeptContributionData((data.department_contribution || []).map((dept, i) => ({
                name: dept.department_name,
                value: dept.subtask_count,
                fill: colors[i % colors.length]
            })));

            setRiskOverview((data.risk_overview || []).map(risk => {
                const label = getRiskLabel(risk.risk_rating);
                return {
                    label: risk.objective_title,
                    status: label,
                    score: risk.health_score,
                    color: label === 'High' ? 'bg-rose-500 text-white shadow-lg' :
                           label === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                           'bg-emerald-500 text-white shadow-md'
                };
            }));

            setTableData((data.objective_completion || []).map(o => {
                const riskLabel = getRiskLabel(o.risk_rating || o.risk_level || o.rating);
                return {
                    id: o.parent_task_id || o.id,
                    objective: o.objective_title || o.objective,
                    progress: o.progress_pct || o.progress || 0,
                    subComp: o.completed_subtasks || o.sub_comp || 0,
                    subTotal: o.total_subtasks || o.sub_total || 0,
                    depts: Math.max(1, Number(o.department_count || o.dept_count || o.depts || 0)),
                    days: o.total_days || o.days_total || 45,
                    left: o.days_left || o.days_remaining || 0,
                    score: o.health_score || o.score || 0,
                    rating: riskLabel,
                    ratingColor: riskLabel === 'High' ? 'bg-rose-100 text-rose-700' :
                                 riskLabel === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                 'bg-emerald-100 text-emerald-700',
                    scoreColor: (o.health_score || o.score || 0) >= 80 ? 'text-emerald-600' :
                                (o.health_score || o.score || 0) >= 50 ? 'text-amber-500' :
                                'text-rose-600'
                };
            }));

            // ── Build Completion Trend ──
            // Prioritize the actual historical trend data from the server's /dashboard/trends endpoint
            let computedTrend = [];
            const trData = trendsRes.data?.data || trendsRes.data || [];
            
            if (Array.isArray(trData) && trData.length > 0) {
                const totalAll = trData.reduce((s, t) => s + (t.total_tasks || t.total || 1), 0);
                const completedAll = trData.reduce((s, t) => s + (t.completed_tasks || t.Completed || t.completed || 0), 0);
                const needsConversion = completedAll <= totalAll;
                
                computedTrend = trData.map(t => {
                    const total = t.total_tasks || t.total || 1;
                    const done = t.completed_tasks || t.Completed || t.completed || 0;
                    const pct = needsConversion && total > 0 ? Math.round((done / total) * 100) : done;
                    return { name: t.month || t.date || t.name, value: Math.min(100, pct) };
                });
            } else {
                // Fallback: Build trend cumulatively from current task completion statuses 
                // grouped by creation month if server trend is empty
                const monthBuckets = {}; 
                const allTasksFlat = [...(extractTasks(tasksReq)), ...(extractTasks(orgTasksReq))];
                const flatSeen = new Set();
                const uniqueFlat = allTasksFlat.filter(t => {
                    const id = t.id || t.task_id;
                    if (!id || flatSeen.has(id)) return false;
                    flatSeen.add(id);
                    return true;
                });

                uniqueFlat.forEach(t => {
                    const rawDate = t.created_at || t.due_date || t.updated_at;
                    if (!rawDate) return;
                    const monthKey = rawDate.slice(0, 7); // 'YYYY-MM'
                    if (!monthBuckets[monthKey]) monthBuckets[monthKey] = { total: 0, completed: 0 };
                    monthBuckets[monthKey].total += 1;
                    if (['APPROVED', 'COMPLETED'].includes((t.status || '').toUpperCase())) {
                        monthBuckets[monthKey].completed += 1;
                    }
                });

                const sortedMonths = Object.keys(monthBuckets).sort();
                let runTotal = 0, runCompleted = 0;
                computedTrend = sortedMonths.map(month => {
                    runTotal += monthBuckets[month].total;
                    runCompleted += monthBuckets[month].completed;
                    const pct = runTotal > 0 ? Math.round((runCompleted / runTotal) * 100) : 0;
                    return { name: month, value: pct };
                });
            }

            // If still only 1 point, synthesise a rolling trend from objective progress
            if (computedTrend.length <= 1) {
                const avgProgress = serverObjs.length > 0
                    ? Math.round(serverObjs.reduce((s, o) => s + (o.progress_pct || 0), 0) / serverObjs.length)
                    : 0;
                const baseline = Math.max(5, Math.round(avgProgress * 0.4));
                const now = new Date();
                computedTrend = Array.from({ length: 6 }, (_, i) => {
                    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
                    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    // Ramp from baseline to avgProgress
                    const fraction = i / 5;
                    return { name: label, value: Math.round(baseline + (avgProgress - baseline) * fraction) };
                });
            }

            setTrendData(computedTrend);

            let okrOverdue = data.overdue_tasks || [];
            if (!okrOverdue.length) {
                const todayItems = todayRes.data?.data?.items || todayRes.data?.data || todayRes.data?.tasks || todayRes.data || [];
                if (Array.isArray(todayItems)) {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    okrOverdue = todayItems.filter(t => {
                        return t.due_date && t.due_date < todayStr && !['APPROVED', 'CANCELLED'].includes((t.status||'').toUpperCase().replace('_',' '));
                    }).map(t => {
                        const daysLate = Math.floor((new Date() - new Date(t.due_date))/(1000*60*60*24));
                        return { title: t.title || t.objective_title || t.subtask_title || 'Critical Task', days_late: daysLate > 0 ? daysLate : 1 };
                    });
                }
            }
            
            // Sort overdue by most days late
            okrOverdue.sort((a,b) => b.days_late - a.days_late);
            setOverdueTasks(okrOverdue);

        } catch (error) {
            console.error('Error fetching OKR data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [filters]);

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
            {/* ── HEADER ── */}
            <div className="bg-[#1E1B4B] text-white py-4 px-6 rounded-2xl flex justify-between items-center shadow-xl border border-white/10 mb-2">
                 <div className="flex items-center gap-4">
                    <div className="bg-indigo-500/20 p-2.5 rounded-xl backdrop-blur-md border border-white/20">
                        <ShieldCheck className="text-indigo-200" size={26} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">FJ Group — OKR Execution Dashboard</h1>
                 </div>
                 <div className="hidden lg:flex items-center gap-3 text-xs font-black text-indigo-200/60 capitalize tracking-tight">
                    <Calendar size={14} strokeWidth={3} />
                    <span>Executive Real-time Intelligence</span>
                 </div>
            </div>

            {/* ── TOP KPI CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {metrics.map((m, i) => (
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
                        <h3 className="text-[14px] font-black text-white capitalize tracking-tight flex items-center gap-2">
                            <Target size={18} className="text-indigo-400" />
                            Objective Achievement
                        </h3>
                    </div>
                    <div className="p-6 flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={objCompletionData} layout="vertical" margin={{ left: -10, right: 60 }}>
                                <XAxis type="number" hide domain={[0, 100]} />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={140}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                />
                                <Tooltip cursor={{ fill: '#f1f5f9', radius: 4 }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                                    {objCompletionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                    <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: '11px', fontWeight: '900', fill: '#1e3a8a' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Departmental Load */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[420px] overflow-hidden">
                    <div className="bg-[#1E1B4B] px-6 py-4 flex justify-between items-center">
                        <h3 className="text-[14px] font-black text-white capitalize tracking-tight flex items-center gap-2">
                            <Users size={18} className="text-emerald-400" />
                            Departmental Load
                        </h3>
                    </div>
                    <div className="p-6 flex-1 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deptContributionData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="#fff"
                                    strokeWidth={3}
                                >
                                    {deptContributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={50}
                                    formatter={(val) => <span className="text-[10px] font-medium capitalize text-slate-500">{val}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk Overview */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[420px] overflow-hidden">
                    <div className="bg-[#1E1B4B] px-6 py-4 flex justify-between items-center">
                        <h3 className="text-[14px] font-black text-white capitalize tracking-tight flex items-center gap-2">
                            <AlertTriangle size={18} className="text-rose-400" />
                            Risk Overview
                        </h3>
                    </div>
                    <div className="p-6 space-y-3 overflow-y-auto pr-2 flex-1 custom-scrollbar">
                        {riskOverview.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-white transition-all group border-l-4 border-l-transparent hover:border-l-blue-500">
                                <span className="text-[11px] font-medium text-slate-700 truncate flex-1 capitalize tracking-tight" title={r.label}>{r.label}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-blue-700 font-medium text-xs">{r.score}</span>
                                    <span className={`px-2.5 py-1 rounded text-[9px] font-medium capitalize tracking-widest shadow-sm ${r.color}`}>
                                        {r.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── TABLE VIEW ── */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-[#1E1B4B] text-white px-8 py-5 flex justify-between items-center">
                    <h3 className="text-[14px] font-black text-white capitalize tracking-tight flex items-center gap-3">
                        <Target size={20} className="text-indigo-400" strokeWidth={3} />
                        Objective Progress Matrix
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                             <input 
                                type="date" 
                                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-xs text-white outline-none" 
                                value={filters.from_date}
                                onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                            />
                            <span className="text-white/20">/</span>
                            <input 
                                type="date" 
                                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-xs text-white outline-none" 
                                value={filters.to_date}
                                onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f8fafc] text-[10px] font-bold text-slate-400 capitalize tracking-tight border-b border-slate-100">
                            <tr>
                                <th className="py-4 px-6">Obj Id</th>
                                <th className="py-4 px-4 w-[30%]">Objective</th>
                                <th className="py-4 px-2 text-center">Depts</th>
                                <th className="py-4 px-2 text-center">Done</th>
                                <th className="py-4 px-2 text-center">Total</th>
                                <th className="py-4 px-4 min-w-[150px]">Progress</th>
                                <th className="py-4 px-2 text-center">Health</th>
                                <th className="py-4 px-6 text-right">Risk</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tableData.map((row, i) => (
                                <tr 
                                    key={i} 
                                    className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/okr-subtask/${row.id}`)}
                                >
                                    <td className="py-4 px-6 font-medium text-slate-400">OBJ-{row.id || (101 + i)}</td>
                                    <td className="py-4 px-4 font-medium text-slate-800 tracking-tight">{row.objective}</td>
                                    <td className="py-4 px-2 text-center text-blue-700 font-medium">{row.depts}</td>
                                    <td className="py-4 px-2 text-center text-slate-500 font-medium">{row.subComp}</td>
                                    <td className="py-4 px-2 text-center text-slate-800 font-medium tabular-nums">{row.subTotal}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${row.progress > 80 ? 'bg-emerald-500' : row.progress > 50 ? 'bg-blue-600' : 'bg-rose-500'}`}
                                                    style={{ width: `${row.progress}%` }}
                                                />
                                            </div>
                                            <span className="w-10 text-[11px] font-medium text-blue-900">{row.progress}%</span>
                                        </div>
                                    </td>
                                    <td className={`py-4 px-2 text-center font-bold tabular-nums ${row.scoreColor}`}>{row.score}</td>
                                    <td className="py-4 px-6 text-right">
                                        <span className={`px-3 py-1 rounded-md text-[10px] font-medium capitalize tracking-widest ${row.ratingColor}`}>
                                            {row.rating}
                                        </span>
                                    </td>
                                </tr>
                            ))}
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
                    <div style={{ height: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
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
