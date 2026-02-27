import Badge from "./Badge";
import {
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
    RotateCcw,
    XCircle,
    MoreHorizontal
} from "lucide-react";

/* ──────────────────────────────────────────────────
   formatStatus: "IN_PROGRESS" → "In Progress"
─────────────────────────────────────────────────── */
const formatStatus = (status) =>
    status
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

/* ──────────────────────────────────────────────────
   Status icons — keyed to the canonical 6 statuses
─────────────────────────────────────────────────── */
const STATUS_ICONS = {
    NEW: <Circle size={12} className="mr-1" />,
    IN_PROGRESS: <Clock size={12} className="mr-1 animate-pulse" />,
    SUBMITTED: <AlertCircle size={12} className="mr-1" />,
    APPROVED: <CheckCircle2 size={12} className="mr-1" />,
    REWORK: <RotateCcw size={12} className="mr-1" />,
    CANCELLED: <XCircle size={12} className="mr-1" />,
};

/* ──────────────────────────────────────────────────
   TaskTable component
─────────────────────────────────────────────────── */
const TaskTable = ({ tasks = [] }) => {
    /* ================================
       Empty State
    ================================== */
    if (tasks.length === 0) {
        return (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/60 border-dashed">
                <p className="text-slate-500 font-medium">
                    No tasks found matching your criteria.
                </p>
            </div>
        );
    }

    const today = new Date().toISOString().split("T")[0];

    /* ================================
       Table UI
    ================================== */
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200/60 text-xs uppercase tracking-wider text-slate-500 font-medium">
                            <th className="p-5 pl-6">Task Title</th>
                            <th className="p-5">Assignee</th>
                            <th className="p-5">Severity</th>
                            <th className="p-5">Status</th>
                            <th className="p-5">Due Date</th>
                            <th className="p-5 text-right pr-6">Action</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {tasks.map((task) => {
                            const isOverdue =
                                task.dueDate < today &&
                                !["APPROVED", "CANCELLED"].includes(task.status);
                            const displayStatus = isOverdue ? "Overdue" : task.status;

                            return (
                                <tr
                                    key={task.id}
                                    className="group hover:bg-violet-50/30 transition-colors duration-200"
                                >
                                    {/* Title */}
                                    <td className="p-5 pl-6">
                                        <div>
                                            <p className="text-slate-800 text-sm truncate">
                                                {task.title}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                ID: #{task.id}
                                            </p>
                                        </div>
                                    </td>

                                    {/* Assignee */}
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] text-violet-700 font-bold shrink-0">
                                                {task.employeeId?.charAt(0)}
                                            </div>
                                            <span className="text-sm text-slate-600 truncate">
                                                {task.employeeId}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Severity — uses Badge canonical variant */}
                                    <td className="p-5">
                                        <Badge variant={task.severity}>
                                            {task.severity}
                                        </Badge>
                                    </td>

                                    {/* Status — uses Badge canonical variant */}
                                    <td className="p-5">
                                        <Badge variant={displayStatus}>
                                            <span className="inline-flex items-center">
                                                {STATUS_ICONS[displayStatus] || null}
                                                {formatStatus(displayStatus)}
                                            </span>
                                        </Badge>
                                    </td>

                                    {/* Due Date */}
                                    <td className="p-5">
                                        <span className={`text-sm font-medium ${isOverdue ? "text-rose-600" : "text-slate-500"}`}>
                                            {task.dueDate}
                                            {isOverdue && " ⚠️"}
                                        </span>
                                    </td>

                                    {/* Action */}
                                    <td className="p-5 text-right pr-6">
                                        <button className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TaskTable;
