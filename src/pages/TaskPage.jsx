import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Badge from "../components/UI/Badge";
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

            return (
              <tr key={task.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onViewDetails(task)}>
                <td className="p-3 text-slate-400 font-medium">{idx + 1}</td>

                {/* Employee */}
                <td className="p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {assignee?.name?.charAt(0) || '?'}
                    </div>
                    <span className="truncate font-medium">{assignee?.name || task.employee_id}</span>
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

                {/* Date Assigned */}
                <td className="p-3 text-slate-500 whitespace-nowrap">{task.assigned_date}</td>

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
                          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-green-600 text-white hover:bg-green-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRework(task.id); }}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-orange-500 text-white hover:bg-orange-600 transition"
                        >
                          Rework
                        </button>
                      </>
                    )}

                    {/* Reassign (NEW, IN_PROGRESS, SUBMITTED, REWORK) */}
                    {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onReassign(task); }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-500 text-white hover:bg-blue-600 transition"
                      >
                        Reassign
                      </button>
                    )}

                    {/* Cancel: NEW / IN_PROGRESS / SUBMITTED / REWORK */}
                    {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}
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

            const assigneeId = task.employee_id;
            const assignee = users.find(u => u.id === assigneeId);
            const assigner = users.find(u => u.id === task.assigned_by);

            const assigneeName = assignee?.name || assigneeId;
            const assignerName = assigner?.name || task.assigned_by || "System";

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
                  <Badge variant={task.severity}>
                    {task.severity}
                  </Badge>
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
                              if (window.confirm("Are you sure you want to START this task?")) {
                                onStatusChange(task.id, "START");
                              }
                            }}
                            className="px-4 py-2 text-xs font-semibold rounded-full text-white bg-indigo-500 hover:bg-indigo-600 transition shadow-sm whitespace-nowrap"
                          >
                            Start
                          </button>
                        )}

                        {task.status === "IN_PROGRESS" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure you want to SUBMIT this task for approval?")) {
                                onStatusChange(task.id, "SUBMIT");
                              }
                            }}
                            className="px-4 py-2 text-xs font-semibold rounded-full text-white bg-amber-400 hover:bg-amber-500 transition shadow-sm whitespace-nowrap"
                          >
                            Submit
                          </button>
                        )}

                        {task.status === "REWORK" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure you want to RESTART this task?")) {
                                onStatusChange(task.id, "RESTART");
                              }
                            }}
                            className="px-4 py-2 text-xs font-semibold rounded-full text-white bg-indigo-500 hover:bg-indigo-600 transition shadow-sm whitespace-nowrap"
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
                                if (window.confirm("Are you sure you want to APPROVE this task?")) {
                                  onStatusChange(task.id, "APPROVE");
                                }
                              }}
                              className="px-4 py-2 text-xs font-semibold rounded-full text-white bg-green-600 hover:bg-green-700 transition shadow-sm whitespace-nowrap"
                            >
                              Approve
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const reason = window.prompt("Reason for rework:");
                                if (reason !== null) {
                                  onStatusChange(task.id, "REWORK", reason);
                                }
                              }}
                              className="px-4 py-2 text-xs font-semibold rounded-full text-white bg-orange-600 hover:bg-orange-700 transition shadow-sm whitespace-nowrap"
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
                              className="px-4 py-2 text-xs font-semibold rounded-full text-white bg-blue-500 hover:bg-blue-600 transition shadow-sm whitespace-nowrap"
                            >
                              Reassign
                            </button>
                          )}

                        {!["APPROVED", "CANCELLED"].includes(task.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}
                            className="px-4 py-2 text-xs font-semibold rounded-full text-white bg-red-600 hover:bg-red-700 transition shadow-sm whitespace-nowrap"
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
        const usersRes = await api.get('/users');
        setUsers(usersRes.data);
        // Using same hardcoded list as AdminPage for consistency
        setDepartments([
          "Administration", "Finance", "Engineering", "Sales",
          "Accounts Receivables", "Accounts Payables", "Fixed Assets",
          "Treasury and Trade Finance", "MIS Report and Internal Audit",
          "Cash Management Team"
        ]);
      } catch (err) {
        console.error("Failed to fetch support data", err);
      }
    };
    fetchInitialData();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Use scope parameter: 'mine' for personal, 'department' for team/manager, 'org' for CFO/Admin
      // Default to what's appropriate for the current viewMode
      let scopeParam = 'mine';
      if (isCFO) scopeParam = 'org';
      else if (viewMode === 'team') scopeParam = 'department';

      const response = await api.get('/tasks', {
        params: { scope: scopeParam, limit: 50, offset: 0 }
      });
      setTasks(response.data);
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

      const matchesSeverity = filter.severity === "All" || task.severity === filter.severity;
      const matchesDept = filter.department === "All" || task.department === filter.department;

      let matchesStatus = filter.status === "All" || task.status === filter.status;
      if (filter.status === "Overdue") {
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        matchesStatus = task.due_date < today && !['APPROVED', 'CANCELLED'].includes(task.status);
      }

      return matchesSearch && matchesSeverity && matchesDept && matchesStatus;
    });
  }, [tasks, filter]);

  const handleStatusChange = async (taskId, action) => {
    try {
      await api.post(`/tasks/${taskId}/transition`, { action, comment: "" });
      fetchTasks();
    } catch (err) {
      console.error("Failed to update task status", err);
      // Toast handled by global interceptor if it's a 400/409
    }
  };

  const handleCancel = (taskId) => {
    if (window.confirm("Are you sure you want to CANCEL this task?")) {
      handleStatusChange(taskId, "CANCEL");
    }
  };

  const handleAssign = (taskId) => {
    if (window.confirm("Mark this task as assigned and start it?")) {
      handleStatusChange(taskId, "START");
    }
  };

  const handleApprove = (taskId) => {
    if (window.confirm("Are you sure you want to APPROVE this task?")) {
      handleStatusChange(taskId, "APPROVE");
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

  const handleReassign = async ({ employeeId: newAssigneeId, newDueDate }) => {
    try {
      await api.patch(`/tasks/${taskToReassign.id}/reassign`, {
        employee_id: newAssigneeId,
        new_due_date: newDueDate
      });
      setReassignModalOpen(false);
      fetchTasks();
    } catch (err) {
      console.error("Failed to reassign task", err);
      alert("Failed to reassign: " + (err.response?.data?.detail || "Error"));
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

        {(isCFO || (user.role === "Manager" && viewMode === "team")) && (
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
      {user.role === "Manager" && (
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setViewMode("team")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${viewMode === "team"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
              }`}
          >
            Team Tasks
          </button>
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
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Department filter – especially useful for CFO */}
        <select
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-44"
          value={filter.department}
          onChange={(e) => setFilter({ ...filter, department: e.target.value })}
        >
          <option value="All">Department: All</option>
          {departments.map((dept) => (
            <option key={dept.id || dept} value={dept.id || dept}>{dept.name || dept}</option>
          ))}
        </select>
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
