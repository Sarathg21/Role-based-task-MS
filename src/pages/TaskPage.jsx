import { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Badge from "../components/UI/Badge";
import CustomSelect from "../components/UI/CustomSelect";
import { Plus, Search, Loader2, History, Paperclip, ChevronDown, ChevronRight, CheckSquare, Check, X, ArrowLeftRight, RotateCcw, Play, Upload, RefreshCw, AlertTriangle, FileSpreadsheet } from "lucide-react";
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
            <span className="text-[9px] font-black text-rose-600 capitalize tracking-tighter">Overdue</span>
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
    <div className="overflow-x-auto bg-white rounded-[1.5rem] shadow-sm border border-slate-100 mt-6">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-slate-50/30 text-slate-400 text-[12px] capitalize font-medium border-b border-slate-100">
          <tr>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Task ID</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Parent Task ID</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Parent Task</th>
            <th className="py-3 px-4">Employee</th>
            <th className="py-3 px-4">Role</th>
            <th className="py-3 px-4">Dept</th>
            <th className="py-3 px-4">Job Assignment</th>
            <th className="py-3 px-4">Assigned By</th>
            <th className="py-3 px-4">Date Assigned</th>
            <th className="py-3 px-4">Due Date</th>
            <th className="py-3 px-4">Severity</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-slate-700">
          {tasks.map((task, idx) => {
            const today = new Date().toLocaleDateString('en-CA');
            const dueDateKey = toDateKey(task.due_date);
            const isOverdue = dueDateKey && dueDateKey < today && !['APPROVED', 'CANCELLED'].includes(task.status);
            const assigneeId = task.employee_id;
            // Match by emp_id or id
            const assignee = users?.find(u => u.emp_id === assigneeId || u.id === assigneeId);

            const taskKey = typeof task.id === 'object' ? (task.id.$oid || JSON.stringify(task.id)) : (task.id || `task-${idx}`);

            return (
              <tr key={taskKey} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => onViewDetails(task)}>
                <td className="py-2 px-4 font-bold text-violet-600">#{task.id}</td>
                <td className="py-2 px-4 text-slate-500 font-medium">{task.parent_task_id ? `#${task.parent_task_id}` : '-'}</td>
                <td className="py-2 px-4 text-slate-500 font-medium truncate max-w-[150px]">{task.parent_task_title || task.parent_task_name || '-'}</td>

                {/* Employee */}
                <td className="py-2 px-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm border border-white">
                      {(task.assigneeName || task.employee_id || '?').charAt(0)}
                    </div>
                    <span className="truncate font-semibold text-[13px]">{task.assigneeName || task.employee_id}</span>
                  </div>
                </td>

                {/* Role */}
                <td className="py-2 px-4">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize tracking-tighter ${(assignee?.role || task.assignee_role || '').toUpperCase() === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' :
                    (assignee?.role || task.assignee_role || '').toUpperCase() === 'EMPLOYEE' ? 'bg-slate-100 text-slate-600' :
                      (assignee?.role || task.assignee_role || '').toUpperCase() === 'CFO' || (assignee?.role || task.assignee_role || '').toUpperCase() === 'ADMIN' ? 'bg-[#9B51E0] text-white' :
                        'bg-slate-100 text-slate-400'
                    }`}>
                    {String(assignee?.role || task.assignee_role || task.role || '-').toLowerCase()}
                  </span>
                </td>

                {/* Dept */}
                <td className="py-2 px-4 max-w-[120px]">
                  <span className="truncate block font-medium text-slate-500">{task.department}</span>
                </td>

                {/* Job Assignment Name */}
                <td className="py-2 px-4 max-w-[160px]">
                  <div className="font-semibold text-[13px] truncate">{task.title}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{task.description}</div>
                </td>

                {/* Assigned By */}
                <td className="py-2 px-4 text-slate-500 truncate font-medium">
                  {task.assignerName || task.assigned_by || 'System'}
                </td>

                {/* Date Assigned */}
                <td className="py-2 px-4 text-slate-500 whitespace-nowrap font-medium">
                  {task.assigned_date || task.created_at
                    ? new Date(task.assigned_date || task.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '-'}
                </td>

                {/* Due Date */}
                <td className={`p-4 whitespace-nowrap font-semibold text-[13px] ${isOverdue ? 'text-red-500' : 'text-slate-600'}`}>
                  {task.due_date}
                </td>

                {/* Severity */}
                <td className="p-4">
                  {task.severity ? (
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
                      <span className={`w-2 h-2 rounded-full ${task.severity === 'HIGH' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' : task.severity === 'MEDIUM' ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]'}`}></span>
                      {task.severity}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs">-</span>
                  )}
                </td>

                {/* Status */}
                <td className="p-4 text-center">
                  <StatusCell task={task} />
                </td>

                {/* Actions — CFO state machine */}
                <td className="p-4">
                  <div className="flex justify-end gap-1.5 flex-wrap items-center">

                    {/* SUBMITTED → Approve / Rework */}
                    {task.status === 'SUBMITTED' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onApprove(task.id); }}
                          className="px-3 py-1.5 bg-[#10B981] text-white text-[11px] font-bold rounded-lg hover:bg-emerald-600 transition shadow-sm flex items-center gap-1"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRework(task); }}
                          className="px-3 py-1.5 bg-[#F59E0B] text-white text-[11px] font-bold rounded-lg hover:bg-amber-600 transition shadow-sm flex items-center gap-1"
                        >
                          <RotateCcw size={12} /> Rework
                        </button>
                      </>
                    )}

                    {/* Reassign */}
                    {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onReassign(task); }}
                        className="px-3 py-1.5 bg-[#4285F4] text-white text-[11px] font-bold rounded-lg hover:bg-blue-600 transition shadow-sm flex items-center gap-1"
                      >
                        <ArrowLeftRight size={12} /> Reassign
                      </button>
                    )}

                    {/* Cancel */}
                    {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}
                        className="px-3 py-1.5 bg-rose-500 text-white text-[11px] font-bold rounded-lg hover:bg-rose-600 transition shadow-sm flex items-center gap-1"
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
    <div className="overflow-x-auto bg-white rounded-[1.5rem] shadow-sm border border-slate-100 mt-6">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50/30 text-slate-400 text-[12px] capitalize font-medium border-b border-slate-100">
          <tr>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Task ID</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Parent Task ID</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Parent Task</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Task</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Assignee</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Assigned By</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px] text-center">Status</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px] text-center">Severity</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Due Date</th>
            <th className="py-3 px-4 text-slate-400 font-bold capitalize tracking-widest text-[10px] text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-50 text-[13px] text-slate-700">
          {tasks.map((task) => {
            const assigneeName = task.assigneeName || task.employee_id;
            const assignerName = task.assignerName || task.assigned_by || "System";

            return (
              <tr key={task.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => onViewDetails(task)}>
                <td className="p-4 font-bold text-violet-600">#{task.id}</td>
                <td className="p-4 text-slate-500 font-medium">{task.parent_task_id ? `#${task.parent_task_id}` : '-'}</td>
                <td className="p-4 text-slate-500 font-medium truncate max-w-[150px]">{task.parent_task_title || task.parent_task_name || '-'}</td>
                <td className="p-4 min-w-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-semibold text-slate-800 text-[13.5px] truncate max-w-[200px]">{task.title}</div>
                      <div className="text-[11.5px] text-slate-400 truncate mt-0.5 max-w-[200px]">
                        {task.description}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm border border-white">
                      {(assigneeName || '?').charAt(0)}
                    </div>
                    <span className="truncate font-medium">{assigneeName}</span>
                  </div>
                </td>

                <td className="p-4 font-medium text-slate-600 truncate">{assignerName}</td>

                <td className="p-4 text-center">
                  <StatusCell task={task} />
                </td>

                <td className="p-4 text-center">
                  {(() => {
                    const sev = (task.priority || task.severity || '').toUpperCase();
                    return sev ? (
                      <div className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-slate-600">
                        <span className={`w-2 h-2 rounded-full ${sev === 'HIGH' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' : sev === 'MEDIUM' ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]'}`}></span>
                        {sev}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    );
                  })()}
                </td>

                <td className="p-4 font-semibold text-slate-600">{task.due_date}</td>

                {/* ================= Actions ================= */}
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1.5 flex-wrap items-center">

                    {/* ── ASSIGNEE ACTIONS (Employee OR Manager in Personal View) ── */}
                    {viewMode === "personal" && (
                      <>
                        {task.status === "NEW" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "START"); }}
                            className="px-4 py-1.5 bg-[#7B51ED] text-white text-[12px] font-bold rounded-lg hover:bg-violet-700 transition shadow-sm flex items-center gap-1.5"
                          >
                            Start
                          </button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "SUBMIT"); }}
                            className="px-4 py-1.5 bg-[#10B981] text-white text-[12px] font-bold rounded-lg hover:bg-emerald-600 transition shadow-sm flex items-center gap-1.5"
                          >
                            Submit
                          </button>
                        )}
                        {task.status === "REWORK" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "RESTART"); }}
                            className="px-4 py-1.5 bg-[#F59E0B] text-white text-[12px] font-bold rounded-lg hover:bg-amber-600 transition shadow-sm flex items-center gap-1.5"
                          >
                            Restart
                          </button>
                        )}
                        {task.status === "SUBMITTED" && (
                          <span className="text-[11px] text-slate-400 font-medium italic">Pending Review</span>
                        )}
                      </>
                    )}

                    {/* ── REVIEWER ACTIONS (Manager only, in Team View) ── */}
                    {user?.role?.toUpperCase() === "MANAGER" && viewMode === "team" && (
                      <>
                        {task.status === "SUBMITTED" && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "APPROVE"); }}
                              className="px-3 py-1.5 bg-[#10B981] text-white text-[11px] font-bold rounded-lg hover:bg-emerald-600 transition shadow-sm flex items-center gap-1"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onRework(task); }}
                              className="px-3 py-1.5 bg-[#F59E0B] text-white text-[11px] font-bold rounded-lg hover:bg-amber-600 transition shadow-sm flex items-center gap-1"
                            >
                              <RotateCcw size={12} /> Rework
                            </button>
                          </>
                        )}
                        {!['APPROVED', 'CANCELLED'].includes(task.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onReassign(task); }}
                            className="px-3 py-1.5 bg-[#4285F4] text-white text-[11px] font-bold rounded-lg hover:bg-blue-600 transition shadow-sm flex items-center gap-1"
                          >
                            <ArrowLeftRight size={12} /> Reassign
                          </button>
                        )}
                        {!["APPROVED", "CANCELLED"].includes(task.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}
                            className="px-3 py-1.5 bg-rose-500 text-white text-[11px] font-bold rounded-lg hover:bg-rose-600 transition shadow-sm flex items-center gap-1"
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
    taskId: "",
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    const searchParam = params.get('search');
    const taskIdParam = params.get('taskId') || params.get('id');
    const empIdParam = params.get('employeeId') || params.get('empId');
    const statusParam = params.get('status');
    const severityParam = params.get('severity') || params.get('priority');

    if (mode === 'personal' || mode === 'team' || mode === 'all') {
      setViewMode(mode);
    }

    setFilter(prev => {
      const next = { ...prev };
      if (searchParam) { next.search = searchParam; next.taskId = ""; next.employeeId = "All"; }
      if (taskIdParam) { next.taskId = taskIdParam; next.search = ""; next.employeeId = "All"; }
      if (empIdParam) { next.employeeId = empIdParam; next.taskId = ""; next.search = ""; }
      if (statusParam) { next.status = statusParam; next.taskId = ""; }
      if (severityParam) { next.severity = severityParam; next.taskId = ""; }
      return next;
    });
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


      const taskMap = {};
      raw.forEach(t => {
        const id = t.task_id || t.id;
        const title = t.task_title || t.title || t.task_name || t.name || t.directive_title || t.directive_name;
        if (id && title) taskMap[id] = title;
      });

      // Pass 1.5: Fetch each child task's individual detail to retrieve parent_task_title.
      // The backend now returns parent_task_title on GET /tasks/{task_id}.
      // We fetch the *child* task (which the user has access to) rather than the parent task
      // (which may be 403-restricted), so we can reliably read parent_task_title from the response.
      const tasksNeedingParentFetch = [];
      const seenParentIds = new Set();
      raw.forEach(t => {
          const childId = t.task_id || t.id;
          const pid = t.parent_task_id || t.parent_id || (t.parent_task ? (t.parent_task.task_id || t.parent_task.id) : null);
          const ptitle = t.parent_task_title || t.parentTaskTitle || t.parent_task_name || t.parent_title || t.parent_name || t.parent_directive_title || t.parent_directive_name ||
                        (t.parent_task ? (t.parent_task.task_title || t.parent_task.title || t.parent_task.task_name || t.parent_task.name || t.parent_task.directive_title) : '');
          if (pid && !ptitle && !taskMap[pid] && childId && !seenParentIds.has(pid)) {
              seenParentIds.add(pid);
              tasksNeedingParentFetch.push({ childId, pid });
          }
      });

      if (tasksNeedingParentFetch.length > 0) {
          console.log(`TaskPage - Fetching ${tasksNeedingParentFetch.length} task details for parent titles...`);
          await Promise.allSettled(
              tasksNeedingParentFetch.map(async ({ childId, pid }) => {
                  try {
                      const res = await api.get(`/tasks/${childId}`);
                      const detail = res.data?.data || res.data;
                      if (detail && !Array.isArray(detail)) {
                          const parentTitle = detail.parent_task_title || detail.parentTaskTitle;
                          if (parentTitle) taskMap[pid] = parentTitle;
                      }
                  } catch (err) {
                      console.warn(`Failed to fetch task detail ${childId}:`, err);
                  }
              })
          );
      }

      const normalised = raw.map(t => {
        const parentId =
                    t.parent_task_id ??
                    t.parent_id ??
                    (t.parent_task ? (t.parent_task.task_id ?? t.parent_task.id) : null);
        const inlineParentTitle =
  t.parent_task_title ??
  t.parentTaskTitle ??
  t.parent_task_name ??
  t.parent_title ??
  t.parent_name ??
  t.parent_directive_title ??
  t.parent_directive_name ??
  (t.parent_task
    ? (t.parent_task.task_title ??
       t.parent_task.title ??
       t.parent_task.task_name ??
       t.parent_task.name ??
       t.parent_task.directive_title)
    : undefined) ??
  taskMap[parentId] ??
  '';

        return {
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
          parent_task_id: parentId,
          parent_task_title: inlineParentTitle,
        };
      });
      setTasks(normalised);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    const toastId = toast.loading("Preparing Excel export...");
    try {
      const isAdmin = user?.role === 'Admin';
      const isCFO = user?.role === 'CFO';
      let scopeParam = (isAdmin ? 'org' : viewMode === 'team' ? 'department' : 'mine');

      const params = {
        scope: scopeParam,
        from_date: filter.fromDate || undefined,
        to_date: filter.toDate || undefined,
        start_date: filter.fromDate || undefined,
        end_date: filter.toDate || undefined
      };

      if (filter.status && filter.status !== 'All' && filter.status !== 'Overdue') params.status = filter.status;
      if (filter.severity && filter.severity !== 'All') params.priority = filter.severity;
      if (filter.department && filter.department !== 'All') params.department_id = filter.department;
      if (filter.employeeId && filter.employeeId !== 'All') params.assigned_to_emp_id = filter.employeeId;
      if (filter.search) params.search = filter.search;

      let endpoint = '/reports/cfo/export-excel';
      const role = (user?.role || '').toUpperCase();
      if (role === 'EMPLOYEE' || (role === 'MANAGER' && viewMode === 'personal')) {
        // Try the generic endpoint which might be more reliable for employees
        endpoint = '/reports/performance.excel';
      }

      const response = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });

      // Handle potential JSON error wrapped in blob
      if (response.data.size < 250) {
        const text = await response.data.text();
        try {
          const errorJson = JSON.parse(text);
          throw new Error(errorJson.detail || errorJson.message || 'Export failed');
        } catch (e) { /* Proceed if not JSON */ }
      }

      const contentType = response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Excel exported successfully", { id: toastId });
    } catch (err) {
      console.error("Excel export failed", err);
      const errorMsg = err.response?.data?.message || err.message || "Export failed";
      toast.error(errorMsg, { id: toastId });
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchTasks();
  }, [user, viewMode, filter.status, filter.severity, filter.department, filter.employeeId, filter.search, filter.taskId, filter.fromDate, filter.toDate]);

  // Auto-open task details if taskId is present in URL
  useEffect(() => {
    if (filter.taskId && tasks.length > 0) {
      const task = tasks.find(t => String(t.id) === String(filter.taskId));
      if (task) {
        setSelectedTask(task);
        setDetailModalOpen(true);
      }
    }
  }, [filter.taskId, tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // If an exact taskId is provided via URL AND no other filters are set, prioritize it
      const hasOtherFilters = filter.search || (filter.status !== "All") || (filter.severity !== "All") || filter.fromDate || filter.toDate;

      if (filter.taskId && !hasOtherFilters) {
        return String(task.id) === String(filter.taskId);
      }

      const matchesSearch = !filter.search ||
        (task.title || '').toLowerCase().includes(filter.search.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(filter.search.toLowerCase()) ||
        (task.employee_id || '').toLowerCase().includes(filter.search.toLowerCase()) ||
        (task.assigneeName || '').toLowerCase().includes(filter.search.toLowerCase());

      const today = new Date().toLocaleDateString('en-CA');
      const dueDateKey = toDateKey(task.due_date);
      const taskStatus = String(task.status || '').toUpperCase();
      const isOverdue = dueDateKey && dueDateKey < today && !['APPROVED', 'CANCELLED'].includes(taskStatus);

      const matchesStatus = filter.status === "All" ||
        (filter.status === "Overdue" ? isOverdue : taskStatus === String(filter.status).toUpperCase());

      // Check both severity and priority for broader compatibility
      const taskPriority = String(task.priority || task.severity || '').toUpperCase();
      const matchesPriority = filter.severity === "All" || taskPriority === String(filter.severity).toUpperCase();

      const matchesDept = filter.department === "All" ||
        String(task.department_id) === String(filter.department) ||
        String(task.department).toLowerCase().includes(String(filter.department).toLowerCase());

      // Date filtering
      const taskDate = toDateKey(task.due_date || task.assigned_date || task.created_at);
      const matchesFrom = !filter.fromDate || (taskDate && taskDate >= filter.fromDate);
      const matchesTo = !filter.toDate || (taskDate && taskDate <= filter.toDate);

      // Employee filtering (for Managers in team view)
      // Clear employee filter if taskId was explicitly requested or generic filters are active
      const matchesEmployee = filter.employeeId === "All" || String(task.employee_id) === String(filter.employeeId);

      // Exclude Cancelled tasks by default unless explicitly searching for them
      const isCancelled = taskStatus === 'CANCELLED';
      const isExplicitlyLookingForCancelled = String(filter.status).toUpperCase() === 'CANCELLED';
      const shouldExcludeCancelled = isCancelled && !isExplicitlyLookingForCancelled;

      return matchesSearch && matchesStatus && matchesPriority && matchesDept && matchesFrom && matchesTo && matchesEmployee && !shouldExcludeCancelled;
    });
  }, [tasks, filter, isCFO]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

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
      {/* ── METRIC WIDGETS ── */}
      {/* PREMIUM METRIC WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
        {/* Active Tasks */}
        <div className="bg-violet-50/50 p-6 rounded-[2rem] border border-violet-100 flex items-center gap-5 transition-all hover:shadow-lg hover:bg-violet-100/50 group">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-200 shrink-0 group-hover:scale-110 transition-transform">
            <CheckSquare size={24} />
          </div>
          <div>
            <span className="text-[12px] font-black text-violet-500 capitalize tracking-widest block mb-1">Active Tasks</span>
            <span className="text-4xl font-black text-slate-900 leading-none tabular-nums">{tasks.filter(t => !['APPROVED', 'CANCELLED', 'SUBMITTED'].includes(t.status)).length}</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 flex items-center gap-5 transition-all hover:shadow-lg hover:bg-orange-100/50 group">
          <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-200 shrink-0 group-hover:scale-110 transition-transform">
            <Play size={24} />
          </div>
          <div>
            <span className="text-[12px] font-black text-orange-500 capitalize tracking-widest block mb-1">In Progress</span>
            <span className="text-4xl font-black text-slate-900 leading-none tabular-nums">{tasks.filter(t => t.status === 'IN_PROGRESS').length}</span>
          </div>
        </div>

        {/* Pending Submission */}
        <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100 flex items-center gap-5 transition-all hover:shadow-lg hover:bg-amber-100/50 group">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-200 shrink-0 group-hover:scale-110 transition-transform">
            <Upload size={24} />
          </div>
          <div>
            <span className="text-[12px] font-black text-amber-500 capitalize tracking-widest block mb-1">Pending Submission</span>
            <span className="text-4xl font-black text-slate-900 leading-none tabular-nums">{tasks.filter(t => t.status === 'NEW' || t.status === 'REWORK').length}</span>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-rose-50/50 p-6 rounded-[2rem] border border-rose-100 flex items-center gap-5 transition-all hover:shadow-lg hover:bg-rose-100/50 group">
          <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-200 shrink-0 group-hover:scale-110 transition-transform">
            <AlertTriangle size={24} />
          </div>
          <div>
            <span className="text-[12px] font-black text-rose-500 capitalize tracking-widest block mb-1">Overdue</span>
            <span className="text-4xl font-black text-slate-900 leading-none tabular-nums">
              {tasks.filter(t => {
                const today = new Date().toLocaleDateString('en-CA');
                const dueDateKey = toDateKey(t.due_date);
                return dueDateKey && dueDateKey < today && !['APPROVED', 'CANCELLED'].includes(t.status);
              }).length}
            </span>
          </div>
        </div>
      </div>

      {/* View Toggle — Manager only */}
      {user.role === "MANAGER" && (
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => { setViewMode("team"); setFilter(prev => ({ ...prev, taskId: "", employeeId: "All" })); }}
            className={`px-5 py-2 text-sm font-semibold rounded-md transition ${viewMode === "team"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
              }`}
          >
            Team Tasks
          </button>
          <button
            onClick={() => { setViewMode("personal"); setFilter(prev => ({ ...prev, taskId: "", employeeId: "All" })); }}
            className={`px-5 py-2 text-sm font-semibold rounded-md transition ${viewMode === "personal"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
              }`}
          >
            My Tasks
          </button>
        </div>
      )}

      {/* Filters & Search — Premium Spacing */}
      {/* ── UNIFIED SEARCH & FILTERS ── */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-row flex-nowrap items-center gap-2 max-w-7xl mx-auto overflow-visible relative">

        {/* Unified Search Bar Group */}
        <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-400/20 transition-all shrink-0 min-w-[300px]">
          <input
            type="text"
            placeholder="Search tasks..."
            className="flex-1 min-w-[100px] bg-transparent border-none py-2.5 px-5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-0 placeholder:text-slate-400 placeholder:font-bold"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value, taskId: "" })}
          />

          <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />

          {/* Severity Select */}
          <div className="shrink-0 relative">
            <CustomSelect
              options={[
                { value: 'All', label: 'Severity: All' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
              value={filter.severity}
              onChange={(val) => setFilter({ ...filter, severity: val, taskId: "" })}
              variant="borderless"
              style={{ minWidth: '130px' }}
            />
          </div>

          <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />

          {/* Status Select */}
          <div className="shrink-0 relative">
            <CustomSelect
              options={[
                { value: 'All', label: 'Status: All' },
                { value: 'Overdue', label: 'Overdue' },
                { value: 'NEW', label: 'New' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'SUBMITTED', label: 'Submitted' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REWORK', label: 'Rework' },
              ]}
              value={filter.status}
              onChange={(val) => setFilter({ ...filter, status: val, taskId: "" })}
              variant="borderless"
              style={{ minWidth: '140px' }}
            />
          </div>

          {/* CFO Departments Filter - inside the bar if isCFO */}
          {isCFO && (
            <>
              <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
              <div className="shrink-0 relative">
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
                  onChange={(val) => setFilter({ ...filter, department: val, taskId: "" })}
                  variant="borderless"
                  style={{ minWidth: '120px' }}
                />
              </div>
            </>
          )}
        </div>

        {/* Date Range - Adjacent to unified bar */}
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 shrink-0 overflow-visible">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">From</span>
            <input
              type="date"
              className="bg-transparent text-[10px] font-bold outline-none cursor-pointer text-slate-600"
              value={filter.fromDate}
              onChange={(e) => setFilter({ ...filter, fromDate: e.target.value, taskId: "" })}
            />
          </div>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">To</span>
            <input
              type="date"
              className="bg-transparent text-[10px] font-bold outline-none cursor-pointer text-slate-600"
              value={filter.toDate}
              onChange={(e) => setFilter({ ...filter, toDate: e.target.value, taskId: "" })}
            />
          </div>
        </div>

        {/* Sync Data Button */}
        <button
          onClick={() => fetchTasks()}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 active:scale-95 group shrink-0"
        >
          <RefreshCw size={14} className={`group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Data</span>
        </button>

        {/* Excel Export Button */}
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 border border-emerald-100 text-xs font-bold rounded-xl hover:bg-emerald-50 transition-all shadow-sm active:scale-95 group shrink-0"
        >
          <FileSpreadsheet size={14} className="group-hover:scale-110 transition-transform" />
          <span>Export Excel</span>
        </button>

        {/* Reset Button */}
        {(filter.search || filter.fromDate || filter.toDate || filter.status !== 'All' || filter.severity !== 'All' || (isCFO && filter.department !== 'All')) && (
          <button
            onClick={() => setFilter({
              status: "All",
              severity: "All",
              department: "All",
              search: "",
              fromDate: "",
              toDate: "",
              employeeId: "All",
              taskId: (new URLSearchParams(location.search)).get('taskId') || "",
            })}
            className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-all border border-rose-100 shrink-0 shadow-sm"
            title="Clear all filters"
          >
            <X size={18} />
          </button>
        )}
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
              tasks={paginatedTasks}
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
              tasks={paginatedTasks}
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

          {/* Pagination Controls */}
          {filteredTasks.length > 0 && (
            <div className="flex items-center justify-between px-6 py-6 bg-white/50 backdrop-blur-md rounded-2xl border border-white/20 mt-6 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Showing <span className="text-slate-900">{Math.min(filteredTasks.length, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="text-slate-900">{Math.min(filteredTasks.length, currentPage * itemsPerPage)}</span> of <span className="text-slate-900">{filteredTasks.length}</span> Objectives
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm active:scale-90"
                >
                  &lt;
                </button>
                <div className="flex items-center gap-1.5 mx-2">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Basic logic to show limited page numbers if totalPages is large
                    if (totalPages > 7) {
                      if (pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                        if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum} className="text-slate-300">...</span>;
                        return null;
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-black transition-all border ${currentPage === pageNum
                          ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200 scale-110'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-violet-200 hover:text-violet-600'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm active:scale-90"
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </>
      )
      }
    </div >
  );
};

export default TaskPage;






