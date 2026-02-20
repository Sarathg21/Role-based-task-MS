import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { TASKS, USERS, DEPARTMENTS } from "../data/mockData";
import Badge from "../components/UI/Badge";
import { Plus, Search } from "lucide-react";
import ReassignTaskModal from "../components/Modals/ReassignTaskModal";

/* ========================================================= */
/*  CFO Task Table — uses the full column schema requested   */
/* ========================================================= */

const CFOTaskTable = ({ tasks, onStatusChange, onAssign, onApprove, onRework, onReassign, onCancel }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No tasks found
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

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
            <th className="p-3">Date Assigned</th>
            <th className="p-3">Due Date</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {tasks.map((task, idx) => {
            const isOverdue = task.dueDate < today && !['Completed', 'APPROVED', 'CANCELLED'].includes(task.status);
            const displayStatus = isOverdue ? 'Overdue' : task.status;
            const assignee = USERS.find(u => u.id === task.employeeId);

            return (
              <tr key={task.id} className="hover:bg-slate-50">
                <td className="p-3 text-slate-400 font-medium">{idx + 1}</td>

                {/* Employee */}
                <td className="p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {assignee?.name?.charAt(0) || '?'}
                    </div>
                    <span className="truncate font-medium">{assignee?.name || task.employeeId}</span>
                  </div>
                </td>

                {/* Role */}
                <td className="p-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${assignee?.role === 'Manager' ? 'bg-indigo-100 text-indigo-700' :
                    assignee?.role === 'Employee' ? 'bg-slate-100 text-slate-600' :
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

                {/* Date Assigned */}
                <td className="p-3 text-slate-500 whitespace-nowrap">{task.assignedDate}</td>

                {/* Due Date */}
                <td className={`p-3 whitespace-nowrap font-medium ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                  {task.dueDate}
                </td>

                {/* Status */}
                <td className="p-3">
                  <Badge variant={displayStatus}>{displayStatus.replace(/_/g, " ")}</Badge>
                </td>

                {/* Actions — CFO state machine */}
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1 flex-wrap">

                    {/* SUBMITTED → Approve / Rework / Cancel */}
                    {task.status === 'SUBMITTED' && (
                      <>
                        <button
                          onClick={() => onApprove(task.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-green-600 text-white hover:bg-green-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onRework(task.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-orange-500 text-white hover:bg-orange-600 transition"
                        >
                          Rework
                        </button>
                      </>
                    )}

                    {/* Reassign (NEW, IN_PROGRESS, SUBMITTED, REWORK) */}
                    {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <button
                        onClick={() => onReassign(task)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-500 text-white hover:bg-blue-600 transition"
                      >
                        Reassign
                      </button>
                    )}

                    {/* Cancel: NEW / IN_PROGRESS / SUBMITTED / REWORK */}
                    {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <button
                        onClick={() => onCancel(task.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-red-500 text-white hover:bg-red-600 transition"
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
  user,
  onStatusChange,
  onReassign,
  onCancel,
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
            const today = new Date().toISOString().split('T')[0];
            const isOverdue = task.dueDate < today && !['Completed', 'APPROVED', 'CANCELLED'].includes(task.status);
            const displayStatus = isOverdue ? 'Overdue' : task.status;

            const assigneeName =
              USERS.find((u) => u.id === task.employeeId)?.name ||
              task.employeeId;

            const assignerName =
              USERS.find((u) => u.id === task.assignedBy)?.name ||
              task.assignedBy ||
              "System";

            return (
              <tr key={task.id} className="hover:bg-slate-50">
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
                    {displayStatus.replace(/_/g, " ")}
                  </Badge>
                </td>

                <td className="p-4 max-w-[90px] overflow-hidden">
                  <Badge
                    variant={
                      task.severity === "High"
                        ? "danger"
                        : task.severity === "Medium"
                          ? "primary"
                          : "info"
                    }
                  >
                    {task.severity}
                  </Badge>
                </td>

                <td className="p-4 text-slate-500">
                  {task.dueDate}
                </td>

                {/* ================= Actions ================= */}
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">

                    {/* ── EMPLOYEE: Start / Submit / Restart ── */}
                    {user.role === "Employee" && (
                      <>
                        {task.status === "NEW" && (
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to START this task?")) {
                                onStatusChange(task.id, "IN_PROGRESS");
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-amber-500 hover:bg-amber-600 transition shadow-sm"
                          >
                            Start
                          </button>
                        )}

                        {task.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to SUBMIT this task for approval?")) {
                                onStatusChange(task.id, "SUBMITTED");
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 transition shadow-sm"
                          >
                            Submit
                          </button>
                        )}

                        {task.status === "REWORK" && (
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to RESTART this task?")) {
                                onStatusChange(task.id, "IN_PROGRESS");
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-amber-500 hover:bg-amber-600 transition shadow-sm"
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
                              onClick={() => {
                                if (window.confirm("Are you sure you want to APPROVE this task?")) {
                                  onStatusChange(task.id, "APPROVED");
                                }
                              }}
                              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition shadow-sm"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm("Send this task back for REWORK?")) {
                                  onStatusChange(task.id, "REWORK");
                                }
                              }}
                              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 transition shadow-sm"
                            >
                              Rework
                            </button>
                          </>
                        )}

                        {/* Reassign — only for tasks in Manager's own department */}
                        {!['APPROVED', 'CANCELLED'].includes(task.status) &&
                          task.department === user.department && (
                            <button
                              onClick={() => onReassign(task)}
                              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 transition shadow-sm"
                            >
                              Reassign
                            </button>
                          )}

                        {!["APPROVED", "CANCELLED"].includes(task.status) && (
                          <button
                            onClick={() => onCancel(task.id)}
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition shadow-sm"
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
  const [tasks, setTasks] = useState(TASKS);
  const [filter, setFilter] = useState({
    status: "All",
    severity: "All",
    department: "All",
    search: "",
  });
  const [viewMode, setViewMode] = useState(
    user.role === 'CFO' ? 'all' : user.role === 'Manager' ? 'team' : 'personal'
  );

  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [taskToReassign, setTaskToReassign] = useState(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // EMPLOYEE: only see own tasks
      if (user.role === "Employee" && task.employeeId !== user.id) return false;

      // MANAGER: team or personal view
      if (user.role === "Manager") {
        if (viewMode === "team" && task.managerId !== user.id) return false;
        if (viewMode === "personal" && task.employeeId !== user.id) return false;
      }

      // CFO: all tasks (viewMode = 'all') or personal only (viewMode = 'personal')
      if (user.role === "CFO" && viewMode === "personal" && task.employeeId !== user.id) return false;

      // Status filter
      if (filter.status !== "All") {
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = task.dueDate < today && !['Completed', 'APPROVED', 'CANCELLED'].includes(task.status);
        if (filter.status === 'Overdue') return isOverdue;
        if (task.status !== filter.status) return false;
      }

      if (filter.severity !== "All" && task.severity !== filter.severity) return false;
      if (filter.department !== "All" && task.department !== filter.department) return false;
      if (filter.search && !task.title.toLowerCase().includes(filter.search.toLowerCase())) return false;

      return true;
    });
  }, [tasks, user, filter, viewMode]);

  const handleStatusChange = (taskId, newStatus) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const handleCancel = (taskId) => {
    if (window.confirm("Are you sure you want to CANCEL this task?")) {
      handleStatusChange(taskId, "CANCELLED");
    }
  };

  const handleAssign = (taskId) => {
    if (window.confirm("Mark this task as assigned and start it?")) {
      handleStatusChange(taskId, "IN_PROGRESS");
    }
  };

  const handleApprove = (taskId) => {
    if (window.confirm("Are you sure you want to APPROVE this task?")) {
      handleStatusChange(taskId, "APPROVED");
    }
  };

  const handleRework = (taskId) => {
    if (window.confirm("Send this task back for REWORK?")) {
      handleStatusChange(taskId, "REWORK");
    }
  };

  const openReassignModal = (task) => {
    setTaskToReassign(task);
    setReassignModalOpen(true);
  };

  const handleReassign = ({ employeeId: newAssigneeId, newDueDate, reason }) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskToReassign.id) return t;

        // Build history entry for the outgoing employee
        const historyEntry = {
          employeeId: t.employeeId,
          reassignedAt: new Date().toISOString(),
          reassignedBy: user.id,
          statusAtReassign: t.status,
          reason: reason || null,
        };

        // If SUBMITTED → reset to IN_PROGRESS, clear submittedAt
        const newStatus = t.status === 'SUBMITTED' ? 'IN_PROGRESS' : t.status;
        const newSubmittedAt = t.status === 'SUBMITTED' ? null : (t.submittedAt ?? null);

        return {
          ...t,
          employeeId: newAssigneeId,
          assignedBy: user.id,
          dueDate: newDueDate || t.dueDate,
          status: newStatus,
          submittedAt: newSubmittedAt,
          reassignmentHistory: [...(t.reassignmentHistory ?? []), historyEntry],
        };
      })
    );
    setReassignModalOpen(false);
  };


  const isCFO = user.role === 'CFO';
  const pendingCount = filteredTasks.filter(t => !['Completed', 'APPROVED', 'CANCELLED'].includes(t.status)).length;

  return (
    <div className="space-y-6">
      <ReassignTaskModal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        onReassign={handleReassign}
        employees={USERS}
        currentTask={taskToReassign}
        currentUser={user}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-medium text-slate-800">
            {isCFO ? 'Task Management — All Departments' : 'Task Management'}
          </h1>
          <p className="text-slate-500">
            {isCFO
              ? `${filteredTasks.length} tasks shown · ${pendingCount} pending`
              : 'Manage and track project tasks'}
          </p>
        </div>

        {(user.role === "Manager" || user.role === "Admin" || isCFO) && (
          <button
            onClick={() => navigate("/tasks/assign")}
            className="px-4 py-2 text-sm rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition flex items-center"
          >
            <Plus size={20} style={{ marginRight: 8 }} />
            New Task
          </button>
        )}
      </div>

      {/* View Toggle */}
      {(user.role === "Manager" || isCFO) && (
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
          {isCFO && (
            <button
              onClick={() => setViewMode("all")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${viewMode === "all"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              All Departments
            </button>
          )}
          {!isCFO && (
            <button
              onClick={() => setViewMode("team")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${viewMode === "team"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Team Tasks
            </button>
          )}
          <button
            onClick={() => setViewMode("personal")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${viewMode === "personal"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
              }`}
          >
            My Tasks
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-row items-center gap-4">
        <div className="relative w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>

        <select
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-36"
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="All">Status: All</option>
          <option value="Overdue">Overdue</option>
          <option value="NEW">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REWORK">Rework</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-36"
          value={filter.severity}
          onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
        >
          <option value="All">Severity: All</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Department filter – especially useful for CFO */}
        <select
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-44"
          value={filter.department}
          onChange={(e) => setFilter({ ...filter, department: e.target.value })}
        >
          <option value="All">Department: All</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Task Table */}
      {isCFO ? (
        <CFOTaskTable
          tasks={filteredTasks}
          onAssign={handleAssign}
          onApprove={handleApprove}
          onRework={handleRework}
          onReassign={openReassignModal}
          onCancel={handleCancel}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <ActionTaskTable
          tasks={filteredTasks}
          user={user}
          onStatusChange={handleStatusChange}
          onReassign={openReassignModal}
          onCancel={handleCancel}
          viewMode={viewMode}
        />
      )}
    </div>
  );
};

export default TaskPage;
