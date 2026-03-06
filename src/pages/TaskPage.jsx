import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Badge from "../components/UI/Badge";
import CustomSelect from "../components/UI/CustomSelect";
import { Plus, Search, Loader2, History, Paperclip, ChevronDown, ChevronRight } from "lucide-react";
import ReassignTaskModal from "../components/Modals/ReassignTaskModal";
import TaskDetailModal from "../components/Modals/TaskDetailModal";

// Convert status keys to Title Case labels
// e.g. "IN_PROGRESS" → "In Progress", "APPROVED" → "Approved"
const formatStatus = (status) =>
  status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/* ========================================================= */
/*  CFO Task Table — uses the full column schema requested   */
/* ========================================================= */

const CFOTaskTable = ({ tasks, users, onStatusChange, onAssign, onApprove, onRework, onReassign, onCancel, onViewDetails }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No tasks found
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

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
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {tasks.map((task, idx) => {
            const isOverdue = task.due_date < today && !['APPROVED', 'CANCELLED'].includes(task.status);
            const displayStatus = isOverdue ? 'Overdue' : task.status;
            const assigneeId = task.employee_id;
            const assignee = users?.find(u => u.id === assigneeId);

            // Ensure unique key even if task.id is missing or an object
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
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${assignee?.role === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' :
                    assignee?.role === 'EMPLOYEE' ? 'bg-slate-100 text-slate-600' :
                      'bg-violet-100 text-violet-700'
                    }`}>
                    {assignee?.role || '—'}
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
                    : '—'}
                </td>

                {/* Due Date */}
                <td className={`p-3 whitespace-nowrap font-medium ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                  {task.due_date}
                </td>

                {/* Status */}
                <td className="p-3">
                  <Badge variant={displayStatus}>{formatStatus(displayStatus)}</Badge>
                </td>

                {/* Actions — CFO state machine */}
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1 flex-wrap">

                    {/* SUBMITTED → Approve / Rework / Cancel */}
                    {task.status === 'SUBMITTED' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onApprove(task.id); }}
                          className="px-4 py-2 text-xs font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 transition shadow-sm active:scale-95"
                        >
                          Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRework(task.id); }}
                          className="px-4 py-2 text-xs font-semibold rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition shadow-sm active:scale-95"
                        >
                          Rework
                        </button>
                      </>
                    )}

                    {/* Reassign (NEW, IN_PROGRESS, SUBMITTED, REWORK) */}
                    {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onReassign(task); }}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm active:scale-95"
                      >
                        Reassign
                      </button>
                    )}

                    {/* Cancel: NEW / IN_PROGRESS / SUBMITTED / REWORK */}
                    {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500 text-white hover:bg-red-600 transition shadow-sm active:scale-95"
                      >
                        Cancel
                      </button>
                    )}

                    {/* Terminal states — no actions */}
                    {['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <span className="text-[11px] text-slate-400 italic">—</span>
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
            const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
            const isOverdue = task.due_date < today && !['APPROVED', 'CANCELLED'].includes(task.status);
            const displayStatus = isOverdue ? 'Overdue' : task.status;

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

                <td className="p-4 max-w-[120px] overflow-hidden">
                  <Badge variant={displayStatus}>
                    {formatStatus(displayStatus)}
                  </Badge>
                </td>

                <td className="p-4 max-w-[90px] overflow-hidden">
                  {(() => {
                    const sev = (task.priority || task.severity || '').toUpperCase();
                    return sev ? (
                      <Badge variant={sev}>{sev}</Badge>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    );
                  })()}
                </td>

                <td className="p-4 text-slate-500">{task.due_date}</td>

                {/* ================= Actions ================= */}
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">

                    {/* ── EMPLOYEE: Start / Submit / Restart ── */}
                    {user.role === "Employee" && (
                      <>
                        {task.status === "NEW" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(task.id, "START");
                            }}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-indigo-500 hover:bg-indigo-600 transition shadow-sm whitespace-nowrap"
                          >
                            Start
                          </button>
                        )}

                        {task.status === "IN_PROGRESS" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(task.id, "SUBMIT");
                            }}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-amber-400 hover:bg-amber-500 transition shadow-sm whitespace-nowrap"
                          >
                            Submit
                          </button>
                        )}

                        {task.status === "REWORK" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(task.id, "RESTART");
                            }}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-indigo-500 hover:bg-indigo-600 transition shadow-sm whitespace-nowrap"
                          >
                            Restart
                          </button>
                        )}
                      </>
                    )}

                    {/* ── MANAGER: Reassign (own dept) / Approve / Rework / Cancel ── */}
                    {user.role === "Manager" && (
                      <>
                        {task.status === "SUBMITTED" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(task.id, "APPROVE");
                              }}
                              className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 transition shadow-sm whitespace-nowrap"
                            >
                              Approve
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(task.id, "REWORK");
                              }}
                              className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-orange-600 hover:bg-orange-700 transition shadow-sm whitespace-nowrap"
                            >
                              Rework
                            </button>
                          </>
                        )}

                        {/* Reassign — only for tasks in Manager's own department */}
                        {!['APPROVED', 'CANCELLED'].includes(task.status) &&
                          task.department === user.department && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onReassign(task); }}
                              className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-blue-500 hover:bg-blue-600 transition shadow-sm whitespace-nowrap"
                            >
                              Reassign
                            </button>
                          )}

                        {!["APPROVED", "CANCELLED"].includes(task.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-red-600 hover:bg-red-700 transition shadow-sm whitespace-nowrap"
                          >
                            Cancel
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
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: "All",
    severity: "All",
    department: "All",
    search: "",
  });
  const [viewMode, setViewMode] = useState(
    user.role === 'CFO' ? 'all' : (user.role === 'Manager' ? 'team' : 'personal')
  );

  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [taskToReassign, setTaskToReassign] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

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
      // Derive scope — accept an explicit override so callers after state changes work correctly
      const isAdmin = user.role === 'CFO' || user.role === 'Admin';
      let scopeParam = forceScope ?? (isAdmin ? 'org' : viewMode === 'team' ? 'department' : 'mine');

      const response = await api.get('/tasks', {
        params: { scope: scopeParam, limit: 50, offset: 0 }
      });

      // Normalise confirmed API field names → UI expected names
      // Confirmed API shape: { task_id, title, status, priority, due_date,
      //   department_id, department_name, assigned_to_emp_id, assigned_to_name,
      //   assigned_by_emp_id, assigned_by_name, rework_count }
      const raw = Array.isArray(response.data) ? response.data : [];
      const normalised = raw.map(t => ({
        ...t,
        id: t.task_id || t.id,                          // integer — used in all API URLs
        employee_id: t.assigned_to_emp_id,       // for assignee lookup
        assigned_by: t.assigned_by_emp_id,       // for assigner lookup
        // Pre-resolved names from API — avoid needing users list
        assigneeName: t.assigned_to_name,
        assignerName: t.assigned_by_name,
        severity: (t.priority || '').toUpperCase(),
        department: t.department_name || t.department_id,
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
  }, [user, viewMode]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = !filter.search ||
        task.title.toLowerCase().includes(filter.search.toLowerCase()) ||
        task.description?.toLowerCase().includes(filter.search.toLowerCase());

      // API uses 'priority' not 'severity'
      const matchesPriority = filter.severity === "All" || task.priority === filter.severity;
      const matchesDept = filter.department === "All" || task.department_id === filter.department || task.department === filter.department;

      let matchesStatus = filter.status === "All" || task.status === filter.status;
      if (filter.status === "Overdue") {
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        matchesStatus = task.due_date < today && !['APPROVED', 'CANCELLED'].includes(task.status);
      }

      return matchesSearch && matchesPriority && matchesDept && matchesStatus;
    });
  }, [tasks, filter]);

  const handleStatusChange = async (taskId, action) => {
    if (!taskId && taskId !== 0) {
      console.error('[TaskPage] handleStatusChange called with invalid taskId:', taskId, '| action:', action);
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to ${action.toLowerCase()} this task?`);
    if (!confirmed) return;

    try {
      await api.post(`/tasks/${taskId}/transition`, { action, comment: "" });
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

  const handleRework = (taskId) => {
    handleStatusChange(taskId, "REWORK");
  };

  const openReassignModal = (task) => {
    setTaskToReassign(task);
    setReassignModalOpen(true);
  };

  const handleReassign = async ({ employeeId: newAssigneeId, newDueDate, reason }) => {
    const confirmed = window.confirm("Are you sure you want to reassign this task?");
    if (!confirmed) return;
    try {
      // Correct endpoint: POST (not PATCH), with new_assigned_to_emp_id
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


  const isCFO = user.role === 'CFO' || user.role === 'Admin';
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

      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            {isCFO ? 'Task Management — All Departments' : 'Task Management'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isCFO
              ? `${filteredTasks.length} tasks shown · ${pendingCount} pending`
              : 'Manage and track project tasks'}
          </p>
        </div>

        {(isCFO || (user.role === "Manager" && viewMode === "team")) && (
          <button
            onClick={() => navigate("/tasks/assign")}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition shadow-sm hover:shadow flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Plus size={18} />
            New Task
          </button>
        )}
      </div>

      {/* View Toggle */}
      {user.role === "Manager" && (
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
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-row flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-0" style={{ minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full pl-5 pr-12 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-sm transition-all shadow-sm"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
          <Search
            size={18}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        <CustomSelect
          options={[
            { value: 'All', label: 'Status: All' },
            { value: 'Overdue', label: 'Overdue' },
            { value: 'NEW', label: 'Not Started' },
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

        <CustomSelect
          options={[
            { value: 'All', label: 'Dept: All' },
            ...departments.map(dept => ({
              value: typeof dept === 'string' ? dept : (dept.id || dept),
              label: typeof dept === 'string' ? dept : (dept.name || dept)
            }))
          ]}
          value={filter.department}
          onChange={(val) => setFilter({ ...filter, department: val })}
          style={{ minWidth: '160px' }}
        />
      </div>

      {loading ? (
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
              onRework={handleRework}
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
              viewMode={viewMode}
            />
          )}
        </>
      )}
    </div>
  );
};

export default TaskPage;
