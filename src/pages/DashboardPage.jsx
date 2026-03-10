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
      navigate('/admin');
    }
  }, [user, navigate]);

  const RoleComponent = roleDashboardMap[user?.role] || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">Welcome back, {user?.name || 'User'}!</h1>
      </div>

      {RoleComponent ? <RoleComponent /> : <div className="text-slate-500 p-8 text-center">No dashboard available for this role.</div>}
    </div>
  );
};

export default DashboardPage;
