import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    BarChart3,
    LogOut,
    ChevronRight
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const isActive = (path) => {
        return location.pathname === path
            ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-900/20'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-200';
    };

    const NavItem = ({ to, icon: Icon, label }) => (
        <Link
            to={to}
            className={`nav-item ${location.pathname === to ? 'active' : ''}`}
        >
            <div className="flex items-center gap-3">
                <Icon size={20} className={location.pathname === to ? 'text-white' : 'text-slate-500 transition-colors'} />
                <span className="font-medium text-sm tracking-wide">{label}</span>
            </div>
            {location.pathname === to && <ChevronRight size={16} className="text-violet-200" />}
        </Link>
    );

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <BarChart3 className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">PerfMetric</h1>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Enterprise Edition</p>
                    </div>
                </div>
            </div>

            <div className="px-6 mb-6">
                <div className="h-px bg-slate-700 opacity-50"></div>
            </div>

            <nav className="flex-1 space-y-1 px-2">
                <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Menu</div>
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem to="/tasks" icon={CheckSquare} label="My Tasks" />

                {(user.role === 'Manager' || user.role === 'Admin') && (
                    <>
                        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Analytics</div>
                        <NavItem to="/reports" icon={BarChart3} label="Reports & Insights" />
                    </>
                )}

                {user.role === 'Admin' && (
                    <>
                        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Administration</div>
                        <NavItem to="/admin" icon={Users} label="Employee Directory" />
                    </>
                )}
            </nav>

            <div className="p-4 m-4 bg-slate-800 rounded-2xl border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-sm shadow-inner">
                        {user.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.role}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center justify-center gap-2 p-2 w-full text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg transition-all text-sm font-medium"
                >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
