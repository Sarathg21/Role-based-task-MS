import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import EmployeeDashboard from '../components/Dashboard/EmployeeDashboard';
import AdminDashboard from '../components/Dashboard/AdminDashboard';
import CFODashboard from '../components/Dashboard/CFODashboard';
import EmployeePerformanceDashboard from './EmployeePerformanceDashboard';

const roleDashboardMap = {
  Employee: EmployeeDashboard,
  Manager: EmployeePerformanceDashboard,
  Admin: AdminDashboard,
  CFO: CFODashboard,
};

const ROLE_GREET = {
  CFO:      { emoji: '📊', greeting: 'Executive Overview' },
  Manager:  { emoji: '🖥️',  greeting: 'Team Overview' },
  Employee: { emoji: '✅', greeting: 'My Workspace' },
  Admin:    { emoji: '⚙️', greeting: 'Admin Control Center' },
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect is removed to allow Admin to see their dedicated dashboard

  const RoleComponent = roleDashboardMap[user?.role] || null;
  const info = ROLE_GREET[user?.role] || { emoji: '👋', greeting: 'Overview' };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Welcome Strip ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-[700] uppercase tracking-[0.12em] text-indigo-400/80 mb-0.5">
            {info.emoji} {info.greeting}
          </p>
          <h1
            className="text-[24px] font-[800] text-slate-900 tracking-tight leading-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Welcome back, <span className="text-indigo-600">{user?.name || 'User'}</span>
          </h1>
        </div>
      </div>

      {/* ── Role Dashboard ── */}
      {RoleComponent
        ? <RoleComponent />
        : <div className="text-slate-400 p-12 text-center text-sm">No dashboard available for this role.</div>
      }
    </div>
  );
};

export default DashboardPage;
