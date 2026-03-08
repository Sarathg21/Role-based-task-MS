import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Badge from "../components/UI/Badge";
import CustomSelect from "../components/UI/CustomSelect";
import { Plus, Search, Loader2, History, Paperclip, ChevronDown, ChevronRight, CheckSquare, Check, X, ArrowLeftRight, RotateCcw, Play, Upload, RefreshCw } from "lucide-react";
import ReassignTaskModal from "../components/Modals/ReassignTaskModal";
import TaskDetailModal from "../components/Modals/TaskDetailModal";
import ReworkCommentModal from "../components/Modals/ReworkCommentModal";

// Convert status keys to Title Case labels
const formatStatus = (s) => {
  if (!s) return "-";
  const status = String(s).toUpperCase();
  if (status === 'NEW' || status === 'NOT_STARTED') return 'New';
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// Normalize mixed API date formats (YYYY-MM-DD, DD/MM/YYYY, ISO datetime).
const toDateKey = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  const ymdSlash = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymdSlash) return `${ymdSlash[1]}-${ymdSlash[2]}-${ymdSlash[3]}`;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};
/* --- Overdue Status Cell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Show actual status badge + red "Overdue" pill instead of
   replacing the status entirely with "Overdue".
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const StatusCell = ({ task }) => {
  const today = new Date().toLocaleDateString('en-CA');
  const dueDateKey = toDateKey(task.due_date);
  const isOverdue = dueDateKey && dueDateKey < today && !['APPROVED', 'CANCELLED'].includes(task.status);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Badge variant={task.status}>{formatStatus(task.status)}</Badge>
        {isOverdue && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 shadow-sm animate-pulse-gentle">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            <span className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">Overdue</span>
          </span>
        )}
      </div>
    </div>
  );
};

/* ========================================================= */
/* CFO Task Table — uses the full column schema requested */
/* ========================================================= */

const CFOTaskTable = ({ tasks, users, onStatusChange, onAssign, onApprove, onRework, onReassign, onCancel, onViewDetails }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No tasks found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-medium">
          <tr>
            <th className="p-3 w-10">No.</th>
            <th className="p-3">Employee</th>
            <th className="p-3">Role</th>
            <th className="p-3">Dept</th>
            <th className="p-3">Job Assignment</th>
            <th className="p-3">Assigned By</th>
            <th className="p-3">Date Assigned</th>
            <th className="p-3">Due Date</th>
            <th className="p-3">Severity</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {tasks.map((task, idx) => {
            const today = new Date().toLocaleDateString('en-CA');
            const dueDateKey = toDateKey(task.due_date);
            const isOverdue = dueDateKey && dueDateKey < today && !['APPROVED', 'CANCELLED'].includes(task.status);
            const assigneeId = task.employee_id;
            // Match by emp_id or id
            const assignee = users?.find(u => u.emp_id === assigneeId || u.id === assigneeId);

            const taskKey = typeof task.id === 'object' ? (task.id.$oid || JSON.stringify(task.id)) : (task.id || `task-${idx}`);

            return (
              <tr key={taskKey} className="hover:bg-slate-50 cursor-pointer" onClick={() => onViewDetails(task)}>
                <td className="p-3 text-slate-400 font-medium">{idx + 1}</td>

                {/* Employee */}
                <td className="p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {(task.assigneeName || task.employee_id || '?').charAt(0)}
                    </div>
                    <span className="truncate font-medium">{task.assigneeName || task.employee_id}</span>
                  </div>
                </td>

                {/* Role */}
                <td className="p-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${(assignee?.role || task.assignee_role || '').toUpperCase() === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' :
                    (assignee?.role || task.assignee_role || '').toUpperCase() === 'EMPLOYEE' ? 'bg-slate-100 text-slate-600' :
                      (assignee?.role || task.assignee_role || '').toUpperCase() === 'CFO' || (assignee?.role || task.assignee_role || '').toUpperCase() === 'ADMIN' ? 'bg-violet-100 text-violet-700' :
                        'bg-slate-100 text-slate-400'
                    }`}>
                    {assignee?.role || task.assignee_role || task.role || '-'}
                  </span>
                </td>

                {/* Dept */}
                <td className="p-3 max-w-[120px]">
                  <span className="truncate block text-slate-500">{task.department}</span>
                </td>

                {/* Job Assignment Name */}
                <td className="p-3 max-w-[160px]">
                  <div className="font-medium truncate">{task.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{task.description}</div>
                </td>

                {/* Assigned By */}
                <td className="p-3 text-slate-500 truncate">
                  {task.assignerName || task.assigned_by || 'System'}
                </td>

                {/* Date Assigned */}
                <td className="p-3 text-slate-500 whitespace-nowrap">
                  {task.assigned_date || task.created_at
                    ? new Date(task.assigned_date || task.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '-'}
                </td>

                {/* Due Date */}
                <td className={`p-3 whitespace-nowrap font-medium ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                  {task.due_date}
                </td>

                {/* Severity */}
                <td className="p-3">
                  {task.severity ? (
                    <Badge variant={task.severity}>{task.severity}</Badge>
                  ) : (
                    <span className="text-slate-400 text-xs">-</span>
                  )}
                </td>

                {/* Status */}
                <td className="p-3">
                  <StatusCell task={task} />
                </td>

                {/* Actions — CFO state machine */}
                <td className="p-3">
                  <div className="flex justify-end gap-1 flex-wrap items-center">

                    {/* SUBMITTED → Approve / Rework */}
                    {task.status === 'SUBMITTED' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onApprove(task.id); }}
                          className="btn-action btn-action-success flex items-center gap-1"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRework(task); }}
                          className="btn-action btn-action-warning flex items-center gap-1"
                        >
                          <RotateCcw size={12} /> Rework
                        </button>
                      </>
                    )}

                    {/* Reassign */}
                    {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onReassign(task); }}
                        className="btn-action btn-action-primary flex items-center gap-1"
                      >
                        <ArrowLeftRight size={12} /> Reassign
                      </button>
                    )}

                    {/* Cancel */}
                    {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}
                        className="btn-action btn-action-danger flex items-center gap-1"
                      >
                        <X size={12} /> Cancel
                      </button>
                    )}

                    {/* Terminal states */}
                    {['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <span className="text-[11px] text-slate-300 italic">-</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ========================================================= */
/* Standard Action Task Table (Manager + Employee)           */
/* ========================================================= */

const ActionTaskTable = ({
  tasks,
  users,
  user,
  onStatusChange,
  onReassign,
  onCancel,
  onViewDetails,
  onRework,
  viewMode = "team",
}) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No tasks found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
          <tr>
            <th className="p-4">Task</th>
            <th className="p-4">Assignee</th>
            <th className="p-4">Assigned By</th>
            <th className="p-4">Status</th>
            <th className="p-4">Severity</th>
            <th className="p-4">Due Date</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
          {tasks.map((task) => {
            const assigneeName = task.assigneeName || task.employee_id;
            const assignerName = task.assignerName || task.assigned_by || "System";

            return (
              <tr key={task.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onViewDetails(task)}>
                <td className="p-4 min-w-0">
                  <div className="truncate">{task.title}</div>
                  <div className="text-xs text-slate-500">
                    {task.description}
                  </div>
                </td>

                <td className="p-4 truncate">{assigneeName}</td>
                <td className="p-4 truncate">{assignerName}</td>

                <td className="p-4 max-w-[160px]">
                  <StatusCell task={task} />
                </td>

                <td className="p-4 max-w-[90px] overflow-hidden">
                  {(() => {
                    const sev = (task.priority || task.severity || '').toUpperCase();
                    return sev ? (
                      <Badge variant={sev}>{sev}</Badge>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    );
                  })()}
                </td>

                <td className="p-4 text-slate-500">{task.due_date}</td>

                {/* ================= Actions ================= */}
                <td className="p-4">
                  <div className="flex justify-end gap-1.5 flex-wrap items-center">

                    {/* ── ASSIGNEE ACTIONS (Employee OR Manager in Personal View) ── */}
                    {viewMode === "personal" && (
                      <>
                        {task.status === "NEW" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "START"); }}
                            className="btn-action btn-action-violet flex items-center gap-1"
                          >
                            <Play size={12} fill="white" /> Start
                          </button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "SUBMIT"); }}
                            className="btn-action btn-action-warning flex items-center gap-1"
                          >
                            <Upload size={12} /> Submit
                          </button>
                        )}
                        {task.status === "REWORK" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "RESTART"); }}
                            className="btn-action btn-action-violet flex items-center gap-1"
                          >
                            <RefreshCw size={12} /> Restart
                          </button>
                        )}
                      </>
                    )}

                    {/* ── REVIEWER ACTIONS (Manager only, in Team View) ── */}
                    {user.role === "Manager" && viewMode === "team" && (
                      <>
                        {task.status === "SUBMITTED" && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "APPROVE"); }}
                              className="btn-action btn-action-success flex items-center gap-1"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onRework(task); }}
                              className="btn-action btn-action-warning flex items-center gap-1"
                            >
                              <RotateCcw size={12} /> Rework
                            </button>
                          </>
                        )}
                        {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onReassign(task); }}
                            className="btn-action btn-action-primary flex items-center gap-1"
                          >
                            <ArrowLeftRight size={12} /> Reassign
                          </button>
                        )}
                        {!["APPROVED", "CANCELLED"].includes(task.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}
                            className="btn-action btn-action-danger flex items-center gap-1"
                          >
                            <X size={12} /> Cancel
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ========================================================= */
/* Main Page                                                 */
/* ========================================================= */

const TaskPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: "All",
    severity: "All",
    department: "All",
    search: "",
    fromDate: "",
    toDate: "",
    employeeId: "All",
  });
  const role = (user.role || '').toUpperCase();
  const isCFO = role === 'CFO' || role === 'ADMIN';
  const isEmployee = role === 'EMPLOYEE';
  const isManager = role === 'MANAGER';
  const [viewMode, setViewMode] = useState(
    isCFO ? 'all' : (isManager ? 'team' : 'personal')
  );

  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [taskToReassign, setTaskToReassign] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Rework comment modal state
  const [reworkModalOpen, setReworkModalOpen] = useState(false);
  const [taskForRework, setTaskForRework] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    const searchParam = params.get('search');

    if (mode === 'personal' || mode === 'team' || mode === 'all') {
      setViewMode(mode);
    }
    if (searchParam) {
      setFilter(prev => ({ ...prev, search: searchParam }));
    }
  }, [location.search]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [usersRes, deptsRes] = await Promise.all([
          api.get('/employees'),
          api.get('/departments'),
        ]);
        setUsers(usersRes.data);
        setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : []);
      } catch (err) {
        console.error("Failed to fetch support data", err);
      }
    };
    fetchInitialData();
  }, []);

  const fetchTasks = async (forceScope) => {
    setLoading(true);
    try {
      const isAdmin = (user.role || '').toUpperCase() === 'CFO' || (user.role || '').toUpperCase() === 'ADMIN';
      let scopeParam = forceScope ?? (isAdmin ? 'org' : viewMode === 'team' ? 'department' : 'mine');

      // Build parameters for server-side filtering
      const params = {
        scope: scopeParam,
        limit: 100,
        offset: 0
      };

      if (filter.status && filter.status !== 'All' && filter.status !== 'Overdue') {
        params.status = filter.status;
      }
      if (filter.severity && filter.severity !== 'All') {
        params.priority = filter.severity; // Backend typically uses 'priority'
      }
      if (filter.department && filter.department !== 'All') {
        params.department_id = filter.department;
      }
      if (filter.employeeId && filter.employeeId !== 'All') {
        params.assigned_to_emp_id = filter.employeeId;
      }
      if (filter.search) {
        params.search = filter.search;
      }
      if (filter.fromDate) {
        params.start_date = filter.fromDate;
      }
      if (filter.toDate) {
        params.end_date = filter.toDate;
      }

      const response = await api.get('/tasks', { params });

      const raw = Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []);
      const normalised = raw.map(t => ({
        ...t,
        id: t.task_id || t.id,
        employee_id: t.assigned_to_emp_id || t.employee_id,
        assigned_by: t.assigned_by_emp_id || t.assigned_by,
        assigneeName: t.assigned_to_name || t.assignee_name || t.employee_name,
        assignerName: t.assigned_by_name || t.assigner_name || t.manager_name,
        severity: (t.priority || t.severity || '').toUpperCase(),
        department_id: t.department_id,
        department: t.department_name || t.department || '',
        assignee_role: t.assignee_role || t.role,
      }));
      setTasks(normalised);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user, viewMode, filter.status, filter.severity, filter.department, filter.employeeId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = !filter.search ||
        (task.title || '').toLowerCase().includes(filter.search.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(filter.search.toLowerCase()) ||
        (task.employee_id || '').toLowerCase().includes(filter.search.toLowerCase()) ||
        (task.assigneeName || '').toLowerCase().includes(filter.search.toLowerCase());

      const today = new Date().toLocaleDateString('en-CA');
      const dueDateKey = toDateKey(task.due_date);
      const isOverdue = dueDateKey && dueDateKey < today && !['APPROVED', 'CANCELLED'].includes(task.status);

      const matchesStatus = filter.status === "All" ||
        (filter.status === "Overdue" ? isOverdue : task.status === filter.status);

      const matchesPriority = filter.severity === "All" || String(task.severity).toUpperCase() === String(filter.severity).toUpperCase();
      const matchesDept = filter.department === "All" ||
        String(task.department_id) === String(filter.department) ||
        String(task.department).toLowerCase().includes(String(filter.department).toLowerCase());

      // Date filtering
      const taskDate = toDateKey(task.due_date || task.assigned_date || task.created_at);
      const matchesFrom = !filter.fromDate || (taskDate && taskDate >= filter.fromDate);
      const matchesTo = !filter.toDate || (taskDate && taskDate <= filter.toDate);

      // Employee filtering (for Managers in team view)
      const matchesEmployee = filter.employeeId === "All" || String(task.employee_id) === String(filter.employeeId);

      // Exclude Cancelled tasks by default unless explicitly searching for them
      const isCancelled = task.status === 'CANCELLED';
      const isExplicitlyLookingForCancelled = filter.status === 'CANCELLED';
      const shouldExcludeCancelled = isCancelled && !isExplicitlyLookingForCancelled;

      return matchesSearch && matchesStatus && matchesPriority && matchesDept && matchesFrom && matchesTo && matchesEmployee && !shouldExcludeCancelled;
    });
  }, [tasks, filter, isCFO]);

  const handleStatusChange = async (taskId, action, comment = "") => {
    if (!taskId && taskId !== 0) return;

    const confirmed = window.confirm(`Are you sure you want to ${action.toLowerCase()} this task?`);
    if (!confirmed) return;

    try {
      await api.post(`/tasks/${taskId}/transition`, { action, comment });
      fetchTasks();
    } catch (err) {
      console.error("Failed to update task status", err);
    }
  };

  const handleCancel = (taskId) => {
    handleStatusChange(taskId, "CANCEL");
  };

  const handleAssign = (taskId) => {
    handleStatusChange(taskId, "START");
  };

  const handleApprove = (taskId) => {
    handleStatusChange(taskId, "APPROVE");
  };

  // CFO rework: pass task object so we can show the comment modal
  const handleReworkRequest = (taskOrId) => {
    // If CFO is clicking, taskOrId may be just the id
    const taskId = typeof taskOrId === 'object' ? taskOrId.id : taskOrId;
    const task = typeof taskOrId === 'object' ? taskOrId : tasks.find(t => t.id === taskOrId);
    setTaskForRework(task || { id: taskId });
    setReworkModalOpen(true);
  };

  const handleReworkConfirm = async (comment) => {
    if (!taskForRework) return;
    setReworkModalOpen(false);
    try {
      await api.post(`/tasks/${taskForRework.id}/transition`, { action: "REWORK", comment });
      fetchTasks();
    } catch (err) {
      console.error("Failed to request rework", err);
    }
    setTaskForRework(null);
  };

  const openReassignModal = (task) => {
    setTaskToReassign(task);
    setReassignModalOpen(true);
  };

  const handleReassign = async ({ employeeId: newAssigneeId, newDueDate, reason }) => {
    const confirmed = window.confirm("Are you sure you want to reassign this task?");
    if (!confirmed) return;
    try {
      await api.post(`/tasks/${taskToReassign.id}/reassign`, {
        new_assigned_to_emp_id: newAssigneeId,
        new_due_date: newDueDate,
        reason: reason || ''
      });
      setReassignModalOpen(false);
      fetchTasks();
    } catch (err) {
      console.error("Failed to reassign task", err);
    }
  };

  const openDetailModal = (task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const pendingCount = filteredTasks.filter(t => !['APPROVED', 'CANCELLED'].includes(t.status)).length;

  return (
    <div className="space-y-6">
      <ReassignTaskModal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        onReassign={handleReassign}
        employees={users}
        currentTask={taskToReassign}
        currentUser={user}
      />

      <TaskDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        task={selectedTask}
        currentUser={user}
      />

      <ReworkCommentModal
        isOpen={reworkModalOpen}
        onClose={() => { setReworkModalOpen(false); setTaskForRework(null); }}
        onConfirm={handleReworkConfirm}
        taskTitle={taskForRework?.title}
      />

      {/* â•â• TASK MANAGEMENT PREMIUM HERO â•â• */}
      <div
        className="rounded-3xl overflow-hidden shadow-2xl relative mb-6"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #334155 100%)' }}
      >
        {/* Decorative Premium Blobs */}
        <div className="glass-circle w-64 h-64 bg-white/5 -top-10 -right-10 animate-blob" />
        <div className="glass-circle w-48 h-48 bg-white/5 bottom-0 left-1/4 animate-blob [animation-delay:2s]" />

        <div className="relative z-10 px-8 py-10 flex flex-col items-center text-center gap-6">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/20 animate-float">
              <CheckSquare size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">
                {isCFO ? 'Global Task Hub' : (viewMode === 'team' ? 'Team Task Index' : 'Personal Task Workspace')}
              </h2>
              <p className="text-slate-300 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 opacity-80">
                {isCFO ? 'Strategic Oversight & Lifecycle Management' : (viewMode === 'team' ? 'Department Performance & Team Oversight' : 'Workflow Execution & Performance Tracking')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-3xl">
            {/* Summary Stats in Hero */}
            <div className="flex items-center bg-white/5 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 shadow-inner flex-1 min-w-[280px] text-white">
              <div className="flex-1 flex flex-col px-4 py-1 border-r border-white/10 text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Tasks</span>
                <span className="text-lg font-black">{tasks.filter(t => !['APPROVED', 'CANCELLED'].includes(t.status)).length}</span>
              </div>
              <div className="flex-1 flex flex-col px-4 py-1 text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Overdue</span>
                <span className="text-lg font-black text-rose-400">
                  {tasks.filter(t => { const dueDateKey = toDateKey(t.due_date); return dueDateKey && dueDateKey < new Date().toLocaleDateString('en-CA') && !['APPROVED', 'CANCELLED'].includes(t.status); }).length}
                </span>
              </div>
            </div>

            {/* Primary Action - New Task (if allowed) */}
            {(isCFO || (role === "MANAGER" && viewMode === "team")) && (
              <button
                onClick={() => navigate('/tasks/assign')}
                className="bg-white text-slate-900 hover:bg-slate-100 hover:scale-[1.03] active:scale-[0.97] transition-all px-8 py-4 rounded-2xl font-black text-sm shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] flex items-center gap-3 group whitespace-nowrap"
              >
                <Plus size={18} /> Assign New Task
              </button>
            )}

            <button
              onClick={() => fetchTasks()}
              className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold px-6 py-4 rounded-2xl border border-white/5 backdrop-blur-sm transition-all flex items-center gap-2 group"
            >
              <History size={16} className="group-hover:rotate-[-45deg] transition-transform" /> Sync
            </button>
          </div>
        </div>
      </div>

      {/* View Toggle — Manager only */}
      {
        user.role === "MANAGER" && (
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode("team")}
              className={`px-5 py-2 text-sm font-semibold rounded-md transition ${viewMode === "team"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Team Tasks
            </button>
            <button
              onClick={() => setViewMode("personal")}
              className={`px-5 py-2 text-sm font-semibold rounded-md transition ${viewMode === "personal"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              My Tasks
            </button>
          </div>
        )
      }

      {/* Filters & Search — Premium Spacing */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-row flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-0 flex flex-wrap gap-3">
          <div className="relative flex-1" style={{ minWidth: '450px' }}>
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 text-sm font-medium transition-all placeholder:text-slate-400 shadow-inner"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-200">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">From</span>
              <input
                type="date"
                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                value={filter.fromDate}
                onChange={(e) => setFilter({ ...filter, fromDate: e.target.value })}
              />
            </div>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">To</span>
              <input
                type="date"
                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                value={filter.toDate}
                onChange={(e) => setFilter({ ...filter, toDate: e.target.value })}
              />
            </div>
          </div>

          <button
            onClick={() => fetchTasks()}
            className="px-6 py-3 bg-violet-600 text-white rounded-xl text-xs font-black hover:bg-violet-700 transition active:scale-95 shadow-md whitespace-nowrap"
          >
            Sync Data
          </button>

          {(filter.search || filter.fromDate || filter.toDate || filter.status !== 'All' || filter.severity !== 'All' || filter.department !== 'All' || filter.employeeId !== 'All') && (
            <button
              onClick={() => setFilter({
                status: "All",
                severity: "All",
                department: "All",
                search: "",
                fromDate: "",
                toDate: "",
                employeeId: "All",
              })}
              className="px-4 py-3 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl text-[10px] font-black hover:bg-slate-200 transition uppercase tracking-widest flex items-center gap-1.5"
            >
              <X size={13} /> Reset
            </button>
          )}
        </div>

        <CustomSelect
          options={[
            { value: 'All', label: 'Status: All' },
            { value: 'Overdue', label: 'Overdue' },
            { value: 'NEW', label: 'New' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'SUBMITTED', label: 'Submitted' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REWORK', label: 'Rework' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          value={filter.status}
          onChange={(val) => setFilter({ ...filter, status: val })}
          style={{ minWidth: '160px' }}
        />

        <CustomSelect
          options={[
            { value: 'All', label: 'Severity: All' },
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' },
          ]}
          value={filter.severity}
          onChange={(val) => setFilter({ ...filter, severity: val })}
          style={{ minWidth: '140px' }}
        />

        {/* Departments filter — only for CFO/Admin */}
        {isCFO && (
          <div className="flex items-center gap-2">
            <CustomSelect
              options={[
                { value: 'All', label: 'Dept: All' },
                ...departments.map((dept, idx) => {
                  const val = typeof dept === 'string' ? dept : (dept.department_id || dept.id || dept.name || `dept-${idx}`);
                  const label = typeof dept === 'string' ? dept : (dept.name || dept.department_id || dept.id || 'Unknown');
                  return { value: String(val), label: String(label) };
                })
              ]}
              value={filter.department}
              onChange={(val) => setFilter({ ...filter, department: val })}
              style={{ minWidth: '160px' }}
            />


          </div>
        )}

        {/* Employee Filter — for Managers in Team view */}
        {isManager && viewMode === 'team' && (
          <CustomSelect
            options={[
              { value: 'All', label: 'Staff: All' },
              ...users.filter(u => u.department === user.department).map(u => ({
                value: String(u.emp_id || u.id),
                label: u.name
              }))
            ]}
            value={filter.employeeId}
            onChange={(val) => setFilter({ ...filter, employeeId: val })}
            style={{ minWidth: '160px' }}
          />
        )}
      </div>

      {
        loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-2" />
            <p className="text-slate-500">Loading tasks...</p>
          </div>
        ) : (
          <>
            {/* Task Table */}
            {isCFO ? (
              <CFOTaskTable
                tasks={filteredTasks}
                users={users}
                onAssign={handleAssign}
                onApprove={handleApprove}
                onRework={handleReworkRequest}
                onReassign={openReassignModal}
                onCancel={handleCancel}
                onViewDetails={openDetailModal}
                onStatusChange={(id, action) => handleStatusChange(id, action)}
              />
            ) : (
              <ActionTaskTable
                tasks={filteredTasks}
                users={users}
                user={user}
                onStatusChange={(id, action) => handleStatusChange(id, action)}
                onReassign={openReassignModal}
                onCancel={handleCancel}
                onViewDetails={openDetailModal}
                onRework={handleReworkRequest}
                viewMode={viewMode}
              />
            )}
          </>
        )
      }
    </div>
  );
};

export default TaskPage;






