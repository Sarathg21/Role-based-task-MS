import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import EmployeeDashboard from '../components/Dashboard/EmployeeDashboard';
import ManagerDashboard from '../components/Dashboard/ManagerDashboard';
import AdminDashboard from '../components/Dashboard/AdminDashboard';
import CFODashboard from '../components/Dashboard/CFODashboard';

const roleDashboardMap = {
  Employee: EmployeeDashboard,
  Manager: ManagerDashboard,
  Admin: null,
  CFO: CFODashboard,
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'Admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const RoleComponent = roleDashboardMap[user?.role] || null;

  if (user?.role === 'Admin') return null;

  return (
    <div className="space-y-6">
      <div className="cfo-page-hero rounded-3xl px-6 py-5 border border-white/50 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
        <h1 className="text-3xl font-semibold text-slate-900 mt-1">Welcome back, {user?.name || 'User'}!</h1>
      </div>

      {RoleComponent ? <RoleComponent /> : <div className="text-slate-500 p-8 text-center">No dashboard available for this role.</div>}
    </div>
  );
};

export default DashboardPage;
