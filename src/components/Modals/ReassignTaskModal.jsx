import { useState } from 'react';
import { X, User, CalendarDays, FileText, Clock, AlertTriangle, RotateCcw, Building2 } from 'lucide-react';
import Badge from "../UI/Badge";

/* ── status label map ── */
const STATUS_LABEL = {
    NEW: 'New',
    IN_PROGRESS: 'In Progress',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REWORK: 'Rework',
    CANCELLED: 'Cancelled',
};
const STATUS_COLOR = {
    NEW: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    SUBMITTED: 'bg-violet-100 text-violet-700',
    APPROVED: 'bg-green-100 text-green-700',
    REWORK: 'bg-orange-100 text-orange-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
};

const ReassignTaskModal = ({ isOpen, onClose, onReassign, employees, currentTask, currentUser }) => {
    const [newAssignee, setNewAssignee] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [reason, setReason] = useState('');

    if (!isOpen || !currentTask) return null;

    /* Candidate employees — SAME DEPARTMENT AS THE TASK ONLY.
       Cross-department reassignment is NOT allowed for any role. */
    const taskDept = String(
        currentTask.department_id || currentTask.department_name || currentTask.department || ''
    ).trim().toLowerCase();

    const candidateEmployees = employees.filter(u => {
        const uId = u.emp_id || u.id;
        const uRole = (u.role || '').toUpperCase();

        // Exclude current assignee
        const currentAssigneeId = currentTask.assigned_to_emp_id || currentTask.employee_id || currentTask.assigned_to_id || currentTask.id;
        if (uId && currentAssigneeId && String(uId) === String(currentAssigneeId)) return false;

        // Only Employees and Managers are valid reassignment targets
        if (!['EMPLOYEE', 'MANAGER'].includes(uRole)) return false;

        // ── DEPARTMENT MATCH (always enforced, regardless of current user's role) ──
        if (taskDept) {
            const empDept = String(
                u.department_id || u.department || ''
            ).trim().toLowerCase();
            // Match by name or id — allow partial match to handle name vs id mismatches
            return empDept === taskDept || empDept.includes(taskDept) || taskDept.includes(empDept);
        }

        // If task has no department info, fall back to same-department-as-current-user
        if (currentUser?.role?.toUpperCase() === 'MANAGER') {
            const userDept = String(currentUser.department || currentUser.department_id || '').toLowerCase();
            const empDept = String(u.department_id || u.department || '').toLowerCase();
            return empDept === userDept;
        }

        return true; // Last resort fallback (should rarely hit)
    });

    const currentAssigneeId = currentTask.assigned_to_emp_id || currentTask.employee_id || currentTask.assigned_to_id;
    const currentAssignee = employees.find(u => {
        const uId = u.emp_id || u.id;
        return uId && currentAssigneeId && String(uId) === String(currentAssigneeId);
    });
    const canSave = newAssignee !== '' && newDueDate !== '';

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSave) return;
        // onReassign is async in the parent; it will close the modal on success.
        onReassign({ employeeId: newAssignee, newDueDate, reason });
        setNewAssignee('');
        setNewDueDate('');
        setReason('');
    };

    const history = []; // Reassignment history not yet supported by current backend models

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <RotateCcw size={18} className="text-violet-600" />
                        <h3 className="font-semibold text-slate-800">Reassign Task</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                    {/* ── SUBMITTED warning ── */}
                    {currentTask.status === 'SUBMITTED' && (
                        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800">Status will reset to In Progress</p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    Reassigning a <strong>Submitted</strong> task moves it back to <strong>In Progress</strong>
                                    and clears the submission. The new employee will need to re-submit for approval.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── READ-ONLY: Task Details ── */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Task Details (read-only)</p>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task ID</p>
                                <p className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Clock size={14} className="text-slate-400" /> #{currentTask.task_id || currentTask.id}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                                <span className={`inline-flex text-[11px] font-bold px-2.5 py-1 rounded-lg ${STATUS_COLOR[(currentTask.status || '').toUpperCase()] || 'bg-slate-100 text-slate-600'}`}>
                                    {STATUS_LABEL[(currentTask.status || '').toUpperCase()] || currentTask.status}
                                </span>
                            </div>

                            <div className="col-span-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Title</p>
                                <p className="font-bold text-slate-800 text-[15px] leading-tight">{currentTask.task_title || currentTask.title}</p>
                            </div>

                            {currentTask.description && (
                                <div className="col-span-2 bg-white/50 p-3 rounded-xl border border-slate-100/50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                                    <p className="text-slate-600 text-sm leading-relaxed font-medium">{currentTask.description}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-left">Severity</p>
                                <div className="flex items-center gap-2">
                                    <Badge variant={currentTask.severity}>
                                        {currentTask.severity}
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                                <p className="text-slate-700 font-bold flex items-center gap-2 text-xs">
                                    <Building2 size={14} className="text-indigo-400" />
                                    {currentTask.department_name || currentTask.department || 'N/A'}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Assignee</p>
                                <p className="text-slate-700 font-bold flex items-center gap-2 text-xs">
                                    <User size={14} className="text-violet-400" />
                                    {currentTask.assigned_to_name || currentAssignee?.name || currentTask.employee_id || 'N/A'}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Due Date</p>
                                <p className="text-slate-700 font-bold flex items-center gap-2 text-xs">
                                    <CalendarDays size={14} className="text-rose-400" />
                                    {currentTask.due_date}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── EDITABLE FIELDS ── */}
                    <form id="reassign-form" onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Assignment</p>

                        {/* New Assigned To — mandatory */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                New Assigned To <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select
                                    required
                                    value={newAssignee}
                                    onChange={e => setNewAssignee(e.target.value)}
                                    className="custom-select w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 hover:bg-white transition-colors text-sm"
                                >
                                    <option key="placeholder" value="">— Select employee —</option>
                                    {candidateEmployees.map(emp => {
                                        const eId = emp.emp_id || emp.id;
                                        return (
                                            <option key={eId} value={eId}>
                                                {emp.name} ({emp.department})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            {candidateEmployees.length === 0 && (
                                <p className="text-xs text-rose-500 mt-1">No eligible employees found for this department.</p>
                            )}
                        </div>

                        {/* New Due Date — mandatory */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                New Due Date <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="date"
                                    required
                                    value={newDueDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setNewDueDate(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 hover:bg-white transition-colors text-sm"
                                />
                            </div>
                        </div>

                        {/* Reason — optional */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Reason <span className="text-slate-400 font-normal text-xs">(optional)</span>
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                                <textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={2}
                                    placeholder="Why is this task being reassigned?"
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 hover:bg-white transition-colors text-sm resize-none"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* ── Footer ── */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-full hover:bg-slate-50 transition shadow-sm whitespace-nowrap"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="reassign-form"
                        disabled={!canSave}
                        className={`px-5 py-2 text-xs font-semibold rounded-full transition shadow-sm flex items-center gap-2 whitespace-nowrap ${canSave
                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <RotateCcw size={15} />
                        Confirm Reassign
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReassignTaskModal;

