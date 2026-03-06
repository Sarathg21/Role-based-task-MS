import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import EmployeeDashboard from "../components/Dashboard/EmployeeDashboard";
import ManagerDashboard from "../components/Dashboard/ManagerDashboard";
import AdminDashboard from "../components/Dashboard/AdminDashboard";
import CFODashboard from "../components/Dashboard/CFODashboard";

const roleDashboardMap = {
  Employee: EmployeeDashboard,
  Manager: ManagerDashboard,
  Admin: null,   // Admin is redirected to /admin
  CFO: CFODashboard,
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Admin only sees Employee Directory — redirect them
    if (user?.role === 'Admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const RoleComponent = roleDashboardMap[user?.role] || null;

  if (user?.role === 'Admin') return null; // redirecting

  return (
    <div className="space-y-6">

      {/* ===== Header ===== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user?.name}</p>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>

      {/* ===== Role Dashboard ===== */}
      {RoleComponent ? <RoleComponent /> : <div className="text-slate-500 p-8 text-center">No dashboard available for this role.</div>}

    </div>
  );
};

export default DashboardPage;

