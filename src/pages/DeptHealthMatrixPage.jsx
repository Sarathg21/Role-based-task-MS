import { useState, useEffect } from 'react';
import api from '../services/api';
import {
LayoutDashboard, Users, BarChart3, TrendingUp, TrendingDown,
AlertCircle, CheckCircle2, Clock, RefreshCw, ChevronRight,
ArrowUpRight, ArrowDownRight, Minus, Info
} from 'lucide-react';
import StatsCard from '../components/UI/StatsCard';

const DeptHealthMatrixPage = () => {

const [departments, setDepartments] = useState([]);
const [orgMetrics, setOrgMetrics] = useState({
org_avg_completion_rate: 0,
org_avg_on_time_pct: 0,
org_avg_rework_rate: 0,
top_department: "---",
bottom_department: "---"
});
const [loading, setLoading] = useState(true);

const fetchData = async () => {
setLoading(true);
try {

const [deptRes, metricsRes] = await Promise.all([
api.get('/dashboard/cfo/departments'),
api.get('/dashboard/cfo/org-metrics')
]);

setDepartments(deptRes.data?.data || deptRes.data || []);
setOrgMetrics(metricsRes.data?.data || metricsRes.data || {});

} catch (err) {
console.error("Fetch Health Matrix error:", err);
} finally {
setLoading(false);
}
};

useEffect(() => {
fetchData();
}, []);


// Summary
const onTrackCount = departments.filter(d => d.performance_band === "ON_TRACK").length;
const atRiskCount = departments.filter(d => d.performance_band === "AT_RISK").length;
const offTrackCount = departments.filter(d => d.performance_band === "OFF_TRACK").length;


// HEATMAP COLORS
const getOverdueStyle = (count) => {
    if (count === 0) return 'bg-slate-100 text-slate-400 font-medium';
    if (count === 1) return 'bg-orange-400 text-white';
    if (count === 2) return 'bg-orange-500 text-white';
    return 'bg-rose-500 text-white';
};

const getInProgressStyle = (count) => {
    if (count === 0) return 'bg-slate-100 text-slate-400 font-medium';
    if (count <= 2) return 'bg-yellow-400 text-slate-900';
    if (count <= 5) return 'bg-yellow-500 text-slate-900';
    return 'bg-yellow-600 text-white';
};

const getPendingStyle = (count) => {
    if (count === 0) return 'bg-slate-100 text-slate-400 font-medium';
    if (count === 1) return 'bg-orange-300 text-white';
    return 'bg-orange-400 text-white';
};

const getCompletedStyle = (count) => {
    if (count === 0) return 'bg-slate-100 text-slate-400 font-medium';
    if (count <= 2) return 'bg-green-400/30 text-emerald-800';
    if (count <= 5) return 'bg-green-400/60 text-emerald-900';
    return 'bg-green-500 text-white';
};

const getCompletionRateStyle = (rate) => {
    if (!rate) return 'bg-slate-200 text-slate-500';
    if (rate >= 80) return 'bg-green-500 text-white font-bold';
    if (rate >= 60) return 'bg-yellow-400 text-slate-900 font-bold';
    if (rate >= 40) return 'bg-orange-500 text-white font-bold';
    return 'bg-red-500 text-white font-bold';
};

const getHealthBadgeStyle = (band) => {
    switch (band) {
        case 'ON_TRACK':
            return 'text-emerald-700 bg-emerald-50/50 border-emerald-100';
        case 'AT_RISK':
            return 'text-amber-700 bg-amber-50/50 border-amber-100';
        case 'OFF_TRACK':
            return 'text-rose-700 bg-rose-50/50 border-rose-100';
        default:
            return 'text-slate-500 bg-slate-50 border-slate-100';
    }
};

const getHealthDotStyle = (band) => {
    switch (band) {
        case 'ON_TRACK': return 'bg-emerald-500';
        case 'AT_RISK': return 'bg-amber-500';
        case 'OFF_TRACK': return 'bg-rose-500';
        default: return 'bg-slate-300';
    }
};

const formatRate = (rate) => {
if (!rate) return '—';
return `${Number(rate).toFixed(1)}%`;
};


const renderVsOrgAvg = (deptRate) => {

const orgRate = orgMetrics.org_avg_completion_rate || 0;

if (!deptRate) return <span className="text-slate-300">—</span>;

const diff = deptRate - orgRate;

if (diff > 0) {
return (
<div className="flex items-center gap-1 text-green-600 font-bold">
<TrendingUp size={12} />
<span>{diff.toFixed(1)}%</span>
</div>
);
}

if (diff < 0) {
return (
<div className="flex items-center gap-1 text-red-600 font-bold">
<TrendingDown size={12} />
<span>{Math.abs(diff).toFixed(1)}%</span>
</div>
);
}

return (
<div className="flex items-center gap-1 text-slate-400">
<Minus size={12} />
<span>0%</span>
</div>
);
};


    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                    Department Health Matrix
                </h1>
                <button
                    onClick={fetchData}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl hover:text-violet-600 hover:border-violet-300 transition-all shadow-sm"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Top Summary Cards - Image Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#52ad73] p-6 rounded-lg shadow-sm text-white flex flex-col justify-between h-32 relative overflow-hidden">
                    <span className="text-sm font-medium relative z-10 opacity-90">Departments On Track</span>
                    <span className="text-5xl font-bold relative z-10">{onTrackCount}</span>
                    <CheckCircle2 className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10" />
                </div>

                <div className="bg-[#f0ad4e] p-6 rounded-lg shadow-sm text-white flex flex-col justify-between h-32 relative overflow-hidden">
                    <span className="text-sm font-medium relative z-10 opacity-90">Departments At Risk</span>
                    <span className="text-5xl font-bold relative z-10">{atRiskCount}</span>
                    <AlertCircle className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10" />
                </div>

                <div className="bg-[#d9534f] p-6 rounded-lg shadow-sm text-white flex flex-col justify-between h-32 relative overflow-hidden">
                    <span className="text-sm font-medium relative z-10 opacity-90">Departments Off Track</span>
                    <span className="text-5xl font-bold relative z-10">{offTrackCount}</span>
                    <AlertCircle className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10" />
                </div>

                <div className="bg-[#5bc0de] p-6 rounded-lg shadow-sm text-white flex flex-col justify-between h-32 relative overflow-hidden">
                    <span className="text-sm font-medium relative z-10 opacity-90">Org Avg Completion Rate</span>
                    <span className="text-5xl font-bold relative z-10">{formatRate(orgMetrics.org_avg_completion_rate)}</span>
                    <BarChart3 className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content - Table */}
                <div className="lg:col-span-9 xl:col-span-10 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-700">Department Health Matrix</h2>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#f8fafc] border-b border-slate-200">
                                    <tr className="text-[11px] font-bold text-slate-500">
                                        <th className="p-4 pl-6 border-r border-slate-100">Department</th>
                                        <th className="p-4 text-center border-r border-slate-100">Total Tasks</th>
                                        <th className="p-4 text-center border-r border-slate-100">In Progress</th>
                                        <th className="p-4 text-center border-r border-slate-100">Overdue</th>
                                        <th className="p-4 text-center border-r border-slate-100">Pending</th>
                                        <th className="p-4 text-center border-r border-slate-100">Completed</th>
                                        <th className="p-4 text-center border-r border-slate-100">Completion Rate</th>
                                        <th className="p-4 text-center border-r border-slate-100">Vs Org Avg</th>
                                        <th className="p-4 text-center">Health</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {departments.map((dept, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 last:border-none group hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 pl-6 font-semibold text-slate-700 text-[13px] border-r border-slate-100">
                                                {dept.department_name}
                                            </td>
                                            <td className="p-4 text-center font-bold text-slate-800 text-[18px] border-r border-slate-100">
                                                {dept.total_tasks}
                                            </td>
                                            <td className={`p-4 text-center font-bold text-[18px] border-r border-slate-100 transition-colors ${getInProgressStyle(dept.in_progress)}`}>
                                                {dept.in_progress}
                                            </td>
                                            <td className={`p-4 text-center font-bold text-[18px] border-r border-slate-100 transition-colors ${getOverdueStyle(dept.overdue)}`}>
                                                {dept.overdue}
                                            </td>
                                            <td className={`p-4 text-center font-bold text-[18px] border-r border-slate-100 transition-colors ${getPendingStyle(dept.pending_submission)}`}>
                                                {dept.pending_submission}
                                            </td>
                                            <td className={`p-4 text-center font-bold text-[18px] border-r border-slate-100 transition-colors ${getCompletedStyle(dept.completed)}`}>
                                                {dept.completed}
                                            </td>
                                            <td className={`p-4 text-center font-bold text-[16px] border-r border-slate-100 transition-colors ${getCompletionRateStyle(dept.completion_rate)}`}>
                                                {formatRate(dept.completion_rate)}
                                            </td>
                                            <td className="p-4 text-center border-r border-slate-100">
                                                {renderVsOrgAvg(dept.completion_rate)}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold ${getHealthBadgeStyle(dept.performance_band)}`}>
                                                    <div className={`w-2.5 h-2.5 rounded-full ${getHealthDotStyle(dept.performance_band)} shadow-sm`} />
                                                    {dept.performance_band?.replace("_", " ") || "No Data"}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Insights */}
                <div className="lg:col-span-3 xl:col-span-2 space-y-6 pt-11">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-white">
                            <h3 className="text-lg font-bold text-slate-800">
                                Insights
                            </h3>
                        </div>
                        <div className="p-6 space-y-8">
                            {/* Top Department */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[14px] font-bold text-slate-600">Top Department</label>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-[13px] font-bold text-[#52ad73] leading-tight">{orgMetrics.top_department || "---"}</span>
                                    <TrendingUp size={20} className="text-[#52ad73] shrink-0 fill-[#52ad73]" />
                                </div>
                                <div className="h-0.5 bg-slate-100 mt-6" />
                            </div>

                            {/* Bottom Department */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[14px] font-bold text-slate-600">Bottom Department</label>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-[13px] font-bold text-[#d9534f] leading-tight">{orgMetrics.bottom_department || "---"}</span>
                                    <TrendingDown size={20} className="text-[#d9534f] shrink-0 fill-[#d9534f]" />
                                </div>
                                <div className="h-0.5 bg-slate-100 mt-6" />
                            </div>

                            {/* Avg On-Time */}
                            <div className="space-y-2">
                                <label className="text-[14px] font-bold text-slate-600">Avg On-Time %</label>
                                <div className="text-4xl font-bold text-slate-800 tracking-tight">
                                    {formatRate(orgMetrics.org_avg_on_time_pct)}
                                </div>
                                <div className="h-0.5 bg-slate-100 mt-6" />
                            </div>

                            {/* Avg Rework Rate */}
                            <div className="space-y-2">
                                <label className="text-[14px] font-bold text-slate-600">Avg Rework Rate</label>
                                <div className="text-4xl font-bold text-slate-800 tracking-tight">
                                    {formatRate(orgMetrics.org_avg_rework_rate)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

};

export default DeptHealthMatrixPage;