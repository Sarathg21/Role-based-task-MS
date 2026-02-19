import { useAuth } from "../context/AuthContext";
import EmployeeDashboard from "../components/Dashboard/EmployeeDashboard";
import ManagerDashboard from "../components/Dashboard/ManagerDashboard";
import AdminDashboard from "../components/Dashboard/AdminDashboard";

const roleDashboardMap = {
  Employee: EmployeeDashboard,
  Manager: ManagerDashboard,
  Admin: AdminDashboard,
};

const DashboardPage = () => {
  const { user } = useAuth();

  const RoleComponent = roleDashboardMap[user?.role] || null;

  return (
    <div className="space-y-3">

      {/* ===== Ultra Compact Header ===== */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-md shadow-sm">

        <div className="leading-tight">
          <h1 className="text-lg font-semibold text-slate-800">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            {user?.name}
          </p>
        </div>

        <div className="text-[11px] font-medium text-slate-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>

      </div>

      {/* ===== Role Dashboard ===== */}
      {RoleComponent ? <RoleComponent /> : <div>Unknown Role</div>}

    </div>
  );
};

export default DashboardPage;
