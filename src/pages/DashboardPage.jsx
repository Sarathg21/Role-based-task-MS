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

      {/* ===== Slimmed Dashboard Host Header — Premium Feel ===== */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-1 h-10 bg-violet-500 rounded-full shadow-glow"></div>
          <div>
            <h1 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Dashboard</h1>
            <p className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-none mt-1">{user?.name}</p>
          </div>
        </div>
      </div>

      {/* ===== Role Dashboard ===== */}
      {RoleComponent ? <RoleComponent /> : <div className="text-slate-500 p-8 text-center">No dashboard available for this role.</div>}

    </div>
  );
};

export default DashboardPage;

