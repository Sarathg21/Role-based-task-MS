import {
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
    MoreHorizontal
} from 'lucide-react';

const TaskTable = ({ tasks }) => {
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'In Progress': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'Pending': return 'bg-slate-100 text-slate-600 border-slate-200';
            case 'In Review': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Completed': return <CheckCircle2 size={14} className="mr-1.5" />;
            case 'In Progress': return <Clock size={14} className="mr-1.5 animate-pulse" />;
            case 'Pending': return <Circle size={14} className="mr-1.5" />;
            case 'In Review': return <AlertCircle size={14} className="mr-1.5" />;
            default: return null;
        }
    };

    const getSeverityStyle = (severity) => {
        switch (severity) {
            case 'Critical': return 'text-red-700 bg-red-50 border-red-200';
            case 'High': return 'text-orange-700 bg-orange-50 border-orange-200';
            case 'Medium': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
            case 'Low': return 'text-slate-600 bg-slate-100 border-slate-200';
            default: return 'text-slate-600 bg-slate-50';
        }
    };

    if (!tasks || tasks.length === 0) {
        return (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/60 border-dashed">
                <p className="text-slate-500 font-medium">No tasks found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200/60 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                            <th className="p-5 pl-6">Task Title</th>
                            <th className="p-5">Assignee</th>
                            <th className="p-5">Priority</th>
                            <th className="p-5">Status</th>
                            <th className="p-5">Due Date</th>
                            <th className="p-5 text-right pr-6">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tasks.map((task) => (
                            <tr key={task.id} className="group hover:bg-indigo-50/30 transition-colors duration-200">
                                <td className="p-5 pl-6">
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">{task.title}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">ID: #{task.id}</p>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                            {task.employeeId.charAt(0)}
                                        </div>
                                        <span className="text-sm text-slate-600 font-medium">{task.employeeId}</span>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityStyle(task.severity)}`}>
                                        {task.severity}
                                    </span>
                                </td>
                                <td className="p-5">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(task.status)}`}>
                                        {getStatusIcon(task.status)}
                                        {task.status}
                                    </span>
                                </td>
                                <td className="p-5">
                                    <span className="text-sm text-slate-500 font-medium">{task.dueDate}</span>
                                </td>
                                <td className="p-5 text-right pr-6">
                                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                        <MoreHorizontal size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TaskTable;
