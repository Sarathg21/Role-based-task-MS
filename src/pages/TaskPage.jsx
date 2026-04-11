import { useState, useMemo, useEffect, useRef } from "react";
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
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      <Badge variant={task.status}>{formatStatus(task.status)}</Badge>
      {isOverdue && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span className="text-[9px] font-semibold text-rose-600 whitespace-nowrap">Overdue</span>
        </span>
      )}
    </div>
  );
};

/* ========================================================= */
/* CFO Task Table — uses the full column schema requested */
/* ========================================================= */

const CFOTaskTable = ({ tasks, users, onStatusChange, onAssign, onApprove, onRework, onReassign, onCancel, onViewDetails }) => {
  // Cache of taskId -> assigned_at date string fetched from detail endpoint
  const [assignedDates, setAssignedDates] = useState({});
  const fetchingRef = useRef(new Set());

  // Batch-fetch assigned_at for tasks that don't have it from the list endpoint
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    const missingIds = tasks
      .filter(t => !t.assigned_date && t.id && !fetchingRef.current.has(t.id))
      .map(t => t.id);

    if (missingIds.length === 0) return;

    // Mark as in-flight to avoid duplicate fetches on re-renders
    missingIds.forEach(id => fetchingRef.current.add(id));

    Promise.allSettled(
      missingIds.map(id =>
        api.get(`/tasks/${id}`)
          .then(res => {
            const d = res.data?.data || res.data;
            const dateVal =
              d?.assigned_at ||
              d?.assigned_date ||
              d?.date_assigned ||
              d?.assignment_date ||
              d?.created_at ||
              null;
            if (dateVal) {
              setAssignedDates(prev => ({ ...prev, [id]: dateVal }));
            }
          })
          .catch(() => { /* silently skip if detail fetch fails */ })
      )
    );
  }, [tasks]);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No tasks found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-[1.5rem] shadow-sm border border-slate-100 mt-6 overflow-hidden">
      <table className="w-full text-left border-collapse text-[15px]">
        <thead className="bg-slate-50/10 text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-slate-100/80">
          <tr>
            <th className="py-2.5 px-1.5 pl-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">ID</th>
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px]">PID</th>
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Parent</th>
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px]">User</th>
            <th className="py-2.5 px-1.5 font-bold uppercase tracking-widest text-[10px]">Role</th>
            <th className="py-2.5 px-1.5">Dept</th>
            <th className="py-2.5 px-1.5">Task</th>
            <th className="py-2.5 px-1.5">By</th>
            <th className="py-2.5 px-1.5">Start</th>
            <th className="py-2.5 px-1.5">Due</th>
            <th className="py-2.5 px-1.5 text-center">Prio</th>
            <th className="py-2.5 px-1.5 text-center">Status</th>
            <th className="py-2.5 px-1.5 text-right pr-4">Actions</th>
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
                <td className="py-2 px-1.5 pl-4 font-bold text-violet-600 text-[12px]">#{task.id}</td>
                <td className="py-2 px-1.5 text-slate-400 font-medium text-[11px]">{task.parent_task_id ? `#${task.parent_task_id}` : '-'}</td>
                <td className="py-2 px-1.5 text-slate-500 font-medium truncate max-w-[80px] text-[11px]">{task.parent_task_title || task.parent_task_name || '-'}</td>

                {/* Employee */}
                <td className="py-2 px-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm border border-white">
                      {(task.assigneeName || task.employee_id || '?').charAt(0)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-bold text-[12px] text-slate-800 tracking-tight max-w-[80px]">{task.assigneeName || task.employee_id}</span>
                      {(task.is_reassigned || task.reassigned_from || (task.reassignment_count > 0)) && (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1 py-0.5 mt-0.5 w-fit uppercase tracking-tighter">
                          Reassigned
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="py-2 px-1.5">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full capitalize tracking-widest ${(assignee?.role || task.assignee_role || '').toUpperCase() === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' :
                    (assignee?.role || task.assignee_role || '').toUpperCase() === 'EMPLOYEE' ? 'bg-slate-100 text-slate-600' :
                    (assignee?.role || task.assignee_role || '').toUpperCase() === 'CFO' || (assignee?.role || task.assignee_role || '').toUpperCase() === 'ADMIN' ? 'bg-[#9B51E0] text-white' :
                        'bg-slate-100 text-slate-400'
                    }`}>
                    {String(assignee?.role || task.assignee_role || task.role || '-').toLowerCase()}
                  </span>
                </td>

                <td className="py-2 px-1.5 max-w-[70px]">
                  <span className="truncate block font-medium text-slate-500 text-[11px]">{task.department}</span>
                </td>

                <td className="py-2 px-1.5 max-w-[140px]">
                  <div className="font-bold text-[12px] text-slate-800 truncate tracking-tight">{task.title}</div>
                  <div className="text-[10px] font-medium text-slate-400 truncate mt-0.5">{task.description}</div>
                </td>

                {/* Assigned By */}
                <td className="py-2 px-1.5 text-slate-600 truncate font-semibold text-[11px] max-w-[70px]">
                  {task.assignerName || task.assigned_by || 'System'}
                </td>

                <td className="py-2 px-1.5 text-slate-500 whitespace-nowrap font-medium text-[11px]">
                  {(() => {
                    const dateVal = task.assigned_date || assignedDates[task.id];
                    if (!dateVal) return <span className="text-slate-300 text-[9px]">...</span>;
                    try {
                      return new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                    } catch { return dateVal; }
                  })()}
                </td>

                <td className={`py-2 px-1.5 whitespace-nowrap font-bold text-[11px] ${isOverdue ? 'text-red-500' : 'text-slate-600'}`}>
                  {task.due_date}
                </td>

                <td className="py-2 px-1.5">
                  {task.severity ? (
                    <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-600">
                      <span className={`w-1.5 h-1.5 rounded-full ${task.severity === 'HIGH' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' : task.severity === 'MEDIUM' ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]'}`}></span>
                      {task.severity}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[10px] text-center block">-</span>
                  )}
                </td>

                {/* Status */}
                <td className="py-2 px-1 text-center">
                  <StatusCell task={task} />
                </td>

                <td className="py-2 px-1.5 pr-4">
                  <div className="flex justify-end gap-1 flex-nowrap items-center">

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
    <div className="overflow-x-auto bg-white rounded-[1.5rem] shadow-sm border border-slate-100 mt-6 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50/10 text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-slate-100/80">
          <tr>
            <th className="py-2.5 px-1.5 pl-4 text-slate-400 font-bold capitalize tracking-widest text-[10px]">ID</th>
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px]">PID</th>
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Parent</th>
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Task</th>
            {viewMode !== 'personal' && <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Assignee</th>}
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px]">By</th>
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px] text-center">Status</th>
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px] text-center">Prio</th>
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px]">Due</th>
            <th className="py-2.5 px-1.5 text-slate-400 font-bold capitalize tracking-widest text-[10px] text-right pr-4">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-50 text-[15px] text-slate-700">
          {tasks.map((task) => {
            const assigneeName = task.assigneeName || task.employee_id;
            const assignerName = task.assignerName || task.assigned_by || "System";

            return (
              <tr key={task.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => onViewDetails(task)}>
                <td className="py-2 px-1.5 pl-4 font-bold text-violet-600 text-[12px]">#{task.id}</td>
                <td className="py-2 px-1.5 text-slate-400 font-medium text-[11px]">{task.parent_task_id ? `#${task.parent_task_id}` : '-'}</td>
                <td className="py-2 px-1.5 text-slate-500 font-medium truncate max-w-[80px] text-[11px]">{task.parent_task_title || task.parent_task_name || '-'}</td>
                <td className="py-2 px-1.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-[12.5px] truncate max-w-[150px] tracking-tight">{task.title}</div>
                      <div className="text-[10px] font-medium text-slate-400 truncate mt-0.5 max-w-[150px]">
                        {task.description}
                      </div>
                    </div>
                  </div>
                </td>

                {viewMode !== 'personal' && (
                <td className="py-2 px-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm border border-white">
                      {(assigneeName || '?').charAt(0)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-bold text-slate-800 text-[12px] tracking-tight max-w-[80px]">{assigneeName}</span>
                    </div>
                  </div>
                </td>
                )}

                <td className="py-2 px-1.5 font-bold text-slate-600 truncate text-[11px] max-w-[80px]">{assignerName}</td>

                <td className="py-2 px-1 text-center">
                  <StatusCell task={task} />
                </td>

                <td className="py-2 px-1 text-center">
                  {(() => {
                    const sev = (task.priority || task.severity || '').toUpperCase();
                    return sev ? (
                      <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${sev === 'HIGH' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' : sev === 'MEDIUM' ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]'}`}></span>
                        {sev}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px]">-</span>
                    );
                  })()}
                </td>

                <td className="py-2 px-1.5 font-semibold text-slate-600 text-[11px]">{task.due_date}</td>

                <td className="py-2 px-1.5 text-right pr-4">
                  <div className="flex justify-end gap-1 flex-nowrap items-center">

                    {/* ── ASSIGNEE ACTIONS: START / SUBMIT / RESTART
                        Shown to ANYONE when task is assigned to the current user */}
                    {String(task.employee_id) === String(user?.id) && (
                      <>
                        {(String(task.status).toUpperCase() === "NEW" || String(task.status).toUpperCase() === "NOT_STARTED") && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "START"); }}
                            className="px-4 py-1.5 bg-[#7B51ED] text-white text-[12px] font-bold rounded-lg hover:bg-violet-700 transition shadow-sm flex items-center gap-1.5"
                          >
                            Start
                          </button>
                        )}
                        {String(task.status).toUpperCase() === "IN_PROGRESS" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "SUBMIT"); }}
                            className="px-4 py-1.5 bg-[#10B981] text-white text-[12px] font-bold rounded-lg hover:bg-emerald-600 transition shadow-sm flex items-center gap-1.5"
                          >
                            Submit
                          </button>
                        )}
                        {String(task.status).toUpperCase() === "REWORK" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "RESTART"); }}
                            className="px-4 py-1.5 bg-[#F59E0B] text-white text-[12px] font-bold rounded-lg hover:bg-amber-600 transition shadow-sm flex items-center gap-1.5"
                          >
                            Restart
                          </button>
                        )}
                        {task.status === "SUBMITTED" && (
                          <span className="text-[11px] text-slate-400 font-medium italic">Waiting Approval</span>
                        )}
                      </>
                    )}

                    {/* ── MANAGER REVIEWER ACTIONS: APPROVE / REWORK / REASSIGN / CANCEL
                        Team view: APPROVE/REWORK only for tasks NOT assigned to the manager themselves */}
                    {user?.role?.toUpperCase() === "MANAGER" && viewMode === "team" && (
                      <>
                        {task.status === "SUBMITTED" && String(task.employee_id) !== String(user?.id) && (
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
        const usersData = usersRes.data;
        const userArray = Array.isArray(usersData) ? usersData : (Array.isArray(usersData?.data) ? usersData.data : []);
        setUsers(userArray);
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

      // Pass 1.5: Simplified - we only map titles that happened to be in the same list.
      // Removed parallel detail fetching to avoid server timeouts and 403 errors.

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
          reassigned_to_emp_id: t.reassigned_to_emp_id || t.reassigned_to || t.current_assignee_id || t.current_assignee_emp_id || null,
          assigned_by: t.assigned_by_emp_id || t.assigned_by,
          assigneeName: t.assigned_to_name || t.assignee_name || t.employee_name,
          assignerName: t.assigned_by_name || t.assigner_name || t.manager_name,
          severity: (t.priority || t.severity || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
          department_id: t.department_id,
          department: t.department_name || t.department || '',
          assignee_role: t.assignee_role || t.role,
          parent_task_id: parentId,
          parent_task_title: inlineParentTitle,
          updated_at: t.updated_at || t.modified_at || t.last_modified || null,
          // Normalize all possible "date assigned" field names from the API
          assigned_date:
            t.assigned_date ||
            t.assigned_at ||
            t.date_assigned ||
            t.assignment_date ||
            t.task_assigned_date ||
            t.task_created_at ||
            t.created_at ||
            null,
        };
      });
      let sorted = normalised.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.assigned_date || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.assigned_date || b.created_at || 0);
        return dateB - dateA;
      });

      // Client-side safeguard for "Personal" view mode:
      // Even if scope=mine is used, some backends return tasks where the user is the assigner.
      // We only want execution-level tasks in "Personal" mode.
      if (viewMode === 'personal') {
        const myId = String(user?.emp_id || user?.id || '').toLowerCase();
        sorted = sorted.filter(t => {
          const assigneeId = String(t.employee_id || t.assigned_to_emp_id || t.reassigned_to_emp_id || '').toLowerCase();
          // If task was reassigned to someone else, exclude it
          if (t.reassigned_to_emp_id && assigneeId !== myId) return false;
          return assigneeId === myId;
        });
      }

      setTasks(sorted);
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

      const rolePath = isCFO ? 'cfo' : (user?.role?.toLowerCase() || 'employee');
      let endpoint = `/reports/${rolePath}/export-excel`;
      // Unify the endpoint to use the CFO export which supports all roles via scope parameter
      // This fixes the 404 error encountered on /reports/performance.excel

      const response = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });

      // Handle potential JSON (error or presigned URL) wrapped in blob
      if (response.data.type === 'application/json' || response.data.size < 600) {
        const text = await response.data.text();
        try {
          const json = JSON.parse(text);
          // If it's an error, handle it
          if (json.detail || json.message) {
            const msg = Array.isArray(json.detail) ? json.detail.map(d => d.msg).join(', ') : (json.detail || json.message);
            throw new Error(msg);
          }
          // If it's a presigned URL, use it!
          const downloadUrl = json.download_url || json.data?.download_url;
          if (downloadUrl) {
            window.open(downloadUrl, '_blank');
            toast.success('Download started', { id: toastId });
            return;
          }
        } catch (parseErr) {
          // If not JSON, continue to regular blob handling
          if (parseErr instanceof SyntaxError) { /* ignore */ }
          else throw parseErr;
        }
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
      // Exclude manager's own tasks from Team View
      const isSelf = String(task.employee_id) === String(user?.id);
      if (viewMode === 'team' && (user?.role?.toUpperCase() === 'MANAGER') && isSelf) return false;
      if (viewMode === 'personal') {
        const myId = String(user?.emp_id || user?.id || '');
        const assigneeId = String(task.employee_id || task.assigned_to_emp_id || task.reassigned_to_emp_id || '');
        if (task.reassigned_to_emp_id && assigneeId !== myId) return false;
        if (assigneeId !== myId) return false;
      }
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
    if (!action) { console.error("handleStatusChange called with no action!"); return; }

    const confirmed = window.confirm(`Are you sure you want to ${action.toLowerCase()} this task?`);
    if (!confirmed) return;

    try {
      const payload = { action, ...(comment ? { comment } : {}) };
      await api.post(`/tasks/${taskId}/transition`, payload, {
        headers: { 'X-EMP-ID': user.id }
      });
      const getActionPastTense = (act) => {
        const label = act.charAt(0).toUpperCase() + act.slice(1).toLowerCase();
        if (label.endsWith('e')) return label + 'd';
        if (label.endsWith('t')) return label + 'ed';
        return label + 'ed';
      };
      toast.success(`Task ${getActionPastTense(action)} successfully!`);
      fetchTasks();
    } catch (err) {
      console.error('[TaskPage] Transition error:', {
        action, taskId,
        status: err.response?.status,
        data: err.response?.data,
        code: err.code,
        message: err.message,
      });
      if (err.response?.status === 403) {
        toast.error(
          `⚠️ Permission Denied: The server has blocked the "${action}" action for the "${user.role}" role.`,
          { duration: 8000 }
        );
      } else if (!err.response) {
        toast.error(`Network error: ${err.message || 'Could not reach the server.'}`);
      } else {
        const msg = err.response?.data?.detail || err.response?.data?.message;
        const detail = Array.isArray(msg) ? msg.map(d => d.msg).join(', ') : msg;
        toast.error(detail || 'Action failed. Please try again.');
      }
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

  // Locate your handleReworkConfirm function and update the axios call:
const handleReworkConfirm = async (comment) => {
  if (!taskForRework) return;
  setReworkModalOpen(false);
  try {
    // Add the headers object here as well
    await api.post(`/tasks/${taskForRework.id}/transition`, 
      { action: "REWORK", comment },
      { headers: { 'X-EMP-ID': user.id } } // Add this!
    );
    fetchTasks();
  } catch (err) {
    console.error("Failed to request rework", err);
    toast.error("Rework request failed: " + (err.response?.data?.detail || "Access Denied"));
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
      const payload = {
        new_assigned_to_emp_id: newAssigneeId,
        new_due_date: newDueDate,
        reason: reason || ''
      };
      await api.post(`/tasks/${taskToReassign.id}/reassign`, payload, {
        headers: { 'X-EMP-ID': user.id }
      });
      setReassignModalOpen(false);
      fetchTasks();
      toast.success('Task reassigned successfully!');
    } catch (err) {
      console.error('[Reassign] Failed:', err.response?.data);
      toast.error('Reassign failed: ' + (err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Check fields'));
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-full px-4 mx-auto">
        {/* Active Tasks */}
        <div className="bg-violet-50/50 p-6 rounded-[2rem] border border-violet-100 flex items-center gap-5 transition-all hover:shadow-lg hover:bg-violet-100/50 group">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-200 shrink-0 group-hover:scale-110 transition-transform">
            <CheckSquare size={24} />
          </div>
          <div>
            <span className="text-[12px] font-black text-violet-500 capitalize tracking-widest block mb-1">Active Tasks</span>
            <span className="text-4xl font-black text-slate-900 leading-none tabular-nums">{tasks.filter(t => !['APPROVED', 'CANCELLED', 'SUBMITTED'].includes(String(t.status || '').toUpperCase())).length}</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 flex items-center gap-5 transition-all hover:shadow-lg hover:bg-orange-100/50 group">
          <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-200 shrink-0 group-hover:scale-110 transition-transform">
            <Play size={24} />
          </div>
          <div>
            <span className="text-[12px] font-black text-orange-500 capitalize tracking-widest block mb-1">In Progress</span>
            <span className="text-4xl font-black text-slate-900 leading-none tabular-nums">{tasks.filter(t => String(t.status || '').toUpperCase() === 'IN_PROGRESS').length}</span>
          </div>
        </div>

        {/* Pending Submission */}
        <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100 flex items-center gap-5 transition-all hover:shadow-lg hover:bg-amber-100/50 group">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-200 shrink-0 group-hover:scale-110 transition-transform">
            <Upload size={24} />
          </div>
          <div>
            <span className="text-[12px] font-black text-amber-500 capitalize tracking-widest block mb-1">Pending Submission</span>
            <span className="text-4xl font-black text-slate-900 leading-none tabular-nums">{tasks.filter(t => { const s = String(t.status || '').toUpperCase(); return s === 'NEW' || s === 'REWORK'; }).length}</span>
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
                return dueDateKey && dueDateKey < today && !['APPROVED', 'CANCELLED'].includes(String(t.status || '').toUpperCase());
              }).length}
            </span>
          </div>
        </div>
      </div>

      {/* View Toggle — Manager only */}
      {/* ── EMPLOYEE FILTER BANNER — shown when drilling into a specific employee from Team Performance ── */}
      {filter.employeeId && filter.employeeId !== 'All' && (() => {
        const emp = users.find(u => (u.emp_id || u.id) === filter.employeeId);
        const empName = emp?.name || filter.employeeId;
        const empTasks = filteredTasks;
        const empActive = empTasks.filter(t => !['APPROVED', 'CANCELLED', 'SUBMITTED'].includes(t.status)).length;
        const empInProgress = empTasks.filter(t => t.status === 'IN_PROGRESS').length;
        const empOverdue = empTasks.filter(t => {
          const today = new Date().toLocaleDateString('en-CA');
          const dk = toDateKey(t.due_date);
          return dk && dk < today && !['APPROVED', 'CANCELLED'].includes(t.status);
        }).length;
        const empApproved = empTasks.filter(t => t.status === 'APPROVED').length;
        const completion = empTasks.length ? Math.round((empApproved / empTasks.length) * 100) : 0;
        return (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-full px-4 mx-auto">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-indigo-200 shrink-0">
                {empName.trim().split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Viewing Tasks For</p>
                <p className="text-base font-black text-indigo-900 capitalize leading-tight">{empName}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              {[
                { label: 'Total', value: empTasks.length, color: 'text-slate-700' },
                { label: 'Active', value: empActive, color: 'text-blue-600' },
                { label: 'In Progress', value: empInProgress, color: 'text-orange-600' },
                { label: 'Overdue', value: empOverdue, color: empOverdue > 0 ? 'text-rose-600' : 'text-slate-400' },
                { label: 'Completion', value: `${completion}%`, color: completion >= 70 ? 'text-emerald-600' : 'text-amber-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-xl font-black tabular-nums leading-none ${color}`}>{value}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setFilter(prev => ({ ...prev, employeeId: 'All' }))}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl transition-all shadow-sm shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              Clear Filter
            </button>
          </div>
        );
      })()}

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
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-row flex-nowrap items-center gap-2 max-w-full px-4 mx-auto overflow-visible relative">

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

          {/* Departments Filter - ONLY for CFO/Admin */}
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

          {/* Employee Filter - for Manager in Team View */}
          {isManager && viewMode === 'team' && (
            <>
              <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
              <div className="shrink-0 relative">
                <CustomSelect
                  options={[
                    { value: 'All', label: 'Employee: All' },
                    ...users.map((u, idx) => ({ 
                      value: String(u.emp_id || u.id || `emp-${idx}`), 
                      label: u.name || 'Unknown' 
                    }))
                  ]}
                  value={filter.employeeId}
                  onChange={(val) => setFilter({ ...filter, employeeId: val, taskId: "" })}
                  variant="borderless"
                  style={{ minWidth: '160px' }}
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






