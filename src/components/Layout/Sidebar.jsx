import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    BarChart3,
    LogOut,
    ChevronRight,
    Menu,
    ChevronLeft
} from 'lucide-react';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
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
            className={`nav-item ${location.pathname === to ? 'active' : ''} ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? label : ''}
        >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                <Icon size={22} className={location.pathname === to ? 'text-white' : 'text-slate-400 group-hover:text-slate-300 transition-colors'} />
                {!isCollapsed && <span className="font-medium text-sm tracking-wide">{label}</span>}
            </div>
            {!isCollapsed && location.pathname === to && <ChevronRight size={16} className="text-violet-200" />}
        </Link>
    );

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className={`sidebar-header flex items-center ${isCollapsed ? 'justify-center px-0 flex-col gap-4' : 'justify-between'}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className={`${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'} flex-shrink-0 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20`}>
                        <BarChart3 className="text-white" size={isCollapsed ? 20 : 24} />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <h1 className="text-xl font-bold tracking-tight text-white whitespace-nowrap">PerfMetric</h1>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider whitespace-nowrap">Enterprise Edition</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={toggleSidebar}
                    className={`p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ${isCollapsed ? '' : ''}`}
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            <div className={`px-6 mb-6 ${isCollapsed ? 'px-4' : ''}`}>
                <div className="h-px bg-slate-700 opacity-50"></div>
            </div>

            <nav className={`flex-1 space-y-1 ${isCollapsed ? 'px-2' : 'px-2'} overflow-x-hidden`}>

                {/* ── Admin: Employee Directory only ── */}
                {user.role === 'Admin' && (
                    <>
                        {!isCollapsed && <div className="px-4 mb-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Administration</div>}
                        {isCollapsed && <div className="h-4"></div>}
                        <NavItem to="/admin" icon={Users} label="Employee Directory" />
                    </>
                )}

                {/* ── CFO: Dashboard + Task Management + Reports ── */}
                {user.role === 'CFO' && (
                    <>
                        {!isCollapsed && <div className="px-4 mb-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Menu</div>}
                        {isCollapsed && <div className="h-4"></div>}
                        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                        <NavItem to="/tasks" icon={CheckSquare} label="Accounts Team Tasks" />
                        {!isCollapsed && <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Analytics</div>}
                        {isCollapsed && <div className="h-6"></div>}
                        <NavItem to="/reports" icon={BarChart3} label="Reports & Insights" />
                    </>
                )}

                {/* ── Manager / Employee: Standard nav ── */}
                {(user.role === 'Manager' || user.role === 'Employee') && (
                    <>
                        {!isCollapsed && <div className="px-4 mb-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Menu</div>}
                        {isCollapsed && <div className="h-4"></div>}
                        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                        <NavItem to="/tasks" icon={CheckSquare} label="My Tasks" />
                        {user.role === 'Manager' && (
                            <>
                                {!isCollapsed && <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Analytics</div>}
                                {isCollapsed && <div className="h-6"></div>}
                                <NavItem to="/reports" icon={BarChart3} label="Reports & Insights" />
                            </>
                        )}
                    </>
                )}
            </nav>

            <div className={`m-4 bg-slate-800 rounded-2xl border border-slate-700 ${isCollapsed ? 'p-2 flex flex-col items-center gap-4' : 'p-4'}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 mb-4'}`}>
                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-sm shadow-inner text-white" title={user.name}>
                        {(user.name || 'U').charAt(0)}
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate text-slate-200">{user.name}</p>
                            <p className="text-xs text-slate-400 truncate">{user.role}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={logout}
                    title="Sign Out"
                    className={`flex items-center justify-center gap-2 p-2 w-full text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-all text-sm font-medium ${isCollapsed ? '' : ''}`}
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
