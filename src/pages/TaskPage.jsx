import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { TASKS, USERS, DEPARTMENTS } from "../data/mockData";
import Badge from "../components/UI/Badge";
import { Plus, Search } from "lucide-react";
import ReassignTaskModal from "../components/Modals/ReassignTaskModal";

/* ========================================================= */
/* Action Task Table */
/* ========================================================= */

const ActionTaskTable = ({
  tasks,
  user,
  onStatusChange,
  onReassign,
  onCancel,
  viewMode = "team", // Default view mode
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

                    {/* EMPLOYEE ACTIONS (OR MANAGER IN "MY TASKS" VIEW) */}
                    {(user.role === "Employee" || (user.role === "Manager" && viewMode === "personal")) && (
                      <>
                        {task.status === "NEW" && (
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to START this task?")) {
                                onStatusChange(task.id, "WORKING_ON_IT");
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 transition shadow-sm"
                          >
                            Start
                          </button>
                        )}

                        {task.status === "WORKING_ON_IT" && (
                          <>
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to SUBMIT this task for approval?")) {
                                  onStatusChange(task.id, "SUBMITTED");
                                }
                              }}
                              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
                            >
                              Submit
                            </button>

                            {/* Removed Reassign/Cancel for Employees */}
                          </>
                        )}

                        {task.status === "REWORK" && (
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to RESTART this task?")) {
                                onStatusChange(task.id, "WORKING_ON_IT");
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 transition shadow-sm"
                          >
                            Restart
                          </button>
                        )}
                      </>
                    )}

                    {/* MANAGER ACTIONS IN TEAM VIEW */}
                    {user.role === "Manager" && viewMode === "team" && (
                      <>
                        {task.status === "SUBMITTED" && (
                          <>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to APPROVE this task?"
                                  )
                                ) {
                                  onStatusChange(task.id, "APPROVED");
                                }
                              }}
                              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition shadow-sm"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to return this task for REWORK?"
                                  )
                                ) {
                                  onStatusChange(task.id, "REWORK");
                                }
                              }}
                              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition shadow-sm"
                            >
                              Rework
                            </button>
                          </>
                        )}

                        {/* Remove Reassign/Start/Submit options */}

                        {task.status !== "APPROVED" &&
                          task.status !== "CANCELLED" && (
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
/* Main Page */
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
  const [viewMode, setViewMode] = useState("team"); // 'team' or 'personal'

  const [reassignModalOpen, setReassignModalOpen] =
    useState(false);
  const [taskToReassign, setTaskToReassign] =
    useState(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (
        user.role === "Employee" &&
        task.employeeId !== user.id
      )
        return false;

      // Filter for Managers based on viewMode
      if (user.role === "Manager") {
        if (viewMode === "team" && task.managerId !== user.id) return false;
        if (viewMode === "personal" && task.employeeId !== user.id) return false;
      }

      if (filter.status !== "All") {
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = task.dueDate < today && !['Completed', 'APPROVED', 'CANCELLED'].includes(task.status);
        if (filter.status === 'Overdue') return isOverdue;
        if (task.status !== filter.status) return false;
      }

      if (filter.severity !== "All" &&
        task.severity !== filter.severity)
        return false;

      if (filter.department !== "All" &&
        task.department !== filter.department)
        return false;

      if (
        filter.search &&
        !task.title
          .toLowerCase()
          .includes(filter.search.toLowerCase())
      )
        return false;

      return true;
    });
  }, [tasks, user, filter]);

  const handleStatusChange = (taskId, newStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );
  };

  const handleCancel = (taskId) => {
    if (
      window.confirm(
        "Are you sure you want to CANCEL this task?"
      )
    ) {
      handleStatusChange(taskId, "CANCELLED");
    }
  };

  const openReassignModal = (task) => {
    setTaskToReassign(task);
    setReassignModalOpen(true);
  };

  const handleReassign = (newAssigneeId) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskToReassign.id
          ? {
            ...t,
            employeeId: newAssigneeId,
            assignedBy: user.id,
          }
          : t
      )
    );
    // Modal will be closed by its own onClose logic or passing setState
    setReassignModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <ReassignTaskModal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        onReassign={handleReassign}
        employees={USERS}
        currentTask={taskToReassign}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-medium text-slate-800">
            Task Management
          </h1>
          <p className="text-slate-500">
            Manage and track project tasks
          </p>
        </div>

        {(user.role === "Manager" ||
          user.role === "Admin") && (
            <button
              onClick={() => navigate("/tasks/assign")}
              className="px-4 py-2 text-sm rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition flex items-center"
            >
              <Plus size={20} style={{ marginRight: 8 }} />
              New Task
            </button>
          )}
      </div>

      {/* View Toggle for Managers */}
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
          <option value="WORKING_ON_IT">In Progress</option>
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

        <select
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-40"
          value={filter.department}
          onChange={(e) => setFilter({ ...filter, department: e.target.value })}
        >
          <option value="All">Department: All</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      <ActionTaskTable
        tasks={filteredTasks}
        user={user}
        onStatusChange={handleStatusChange}
        onReassign={openReassignModal}
        onCancel={handleCancel}
        viewMode={viewMode}
      />
    </div>
  );
};

export default TaskPage;
