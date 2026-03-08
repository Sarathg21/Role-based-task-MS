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
    ChevronLeft,
    Sparkles,
    Network,
    Briefcase
} from 'lucide-react';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const roleColors = {
        CFO: 'from-violet-500 to-purple-600',
        MANAGER: 'from-blue-500 to-indigo-600',
        EMPLOYEE: 'from-teal-500 to-emerald-600',
        ADMIN: 'from-rose-500 to-pink-600',
    };
    const currentRole = (user.role || '').toUpperCase();
    const roleGradient = roleColors[currentRole] || 'from-violet-500 to-violet-700';

    const NavItem = ({ to, icon: Icon, label, badge }) => {
        const active = location.pathname === to || (to.includes('?') && location.pathname + location.search === to);
        return (
            <Link
                to={to}
                title={isCollapsed ? label : ''}
                className={`
                    relative flex items-center gap-3 px-4 py-3 mx-3 rounded-xl
                    text-[13px] font-medium
                    transition-all duration-200 group
                    ${isCollapsed ? 'justify-center px-0 mx-2' : ''}
                    ${active
                        ? 'bg-gradient-to-r from-violet-600/90 to-violet-700 text-white shadow-lg shadow-violet-900/25'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }
                `}
            >
                {/* Active left bar */}
                {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full opacity-80" />
                )}

                {/* Icon with bg circle on active */}
                <span className={`
                    flex-shrink-0 transition-all duration-200
                    ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}
                    ${isCollapsed && active ? 'bg-white/20 p-1.5 rounded-lg' : ''}
                `}>
                    <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                </span>

                {/* Label */}
                {!isCollapsed && (
                    <span className="flex-1 tracking-wide">{label}</span>
                )}

                {/* Badge */}
                {!isCollapsed && badge && (
                    <span className="ml-auto text-[10px] font-bold bg-violet-400/30 text-violet-300 px-1.5 py-0.5 rounded-full">
                        {badge}
                    </span>
                )}

                {/* Arrow indicator */}
                {!isCollapsed && active && (
                    <ChevronRight size={14} className="text-violet-300 ml-auto" />
                )}
            </Link>
        );
    };

    const SectionLabel = ({ label }) => (
        !isCollapsed ? (
            <div className="px-7 pt-6 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-80">
                {label}
            </div>
        ) : <div className="h-6" />
    );

    const userRole = (user.role || '').toUpperCase();

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>

            {/* ─── Logo Header ─── */}
            <div className={`sidebar-header flex items-center ${isCollapsed ? 'justify-center px-0 flex-col gap-4' : 'justify-between'}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3 ml-2'}`}>
                    <div className={`
                        flex-shrink-0 bg-gradient-to-br from-violet-500 to-violet-700
                        flex items-center justify-center rounded-xl shadow-lg shadow-violet-500/30
                        transition-all duration-300 w-9 h-9
                    `}>
                        <BarChart3 className="text-white" size={20} />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <h1 className="text-[16px] font-extrabold tracking-tight text-white whitespace-nowrap">
                                PerfMetric
                            </h1>
                            <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest whitespace-nowrap mt-0.5">
                                Enterprise Suite
                            </p>
                        </div>
                    )}
                </div>
                <button
                    onClick={toggleSidebar}
                    className={`
                        p-2 rounded-lg hover:bg-slate-700/60 text-slate-500 hover:text-white 
                        transition-all duration-200 hover:scale-110 active:scale-95
                        ${isCollapsed ? 'mt-2' : 'mr-1'}
                    `}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                    {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* ─── Divider ─── */}
            <div className={`${isCollapsed ? 'mx-3' : 'mx-6'} h-px bg-gradient-to-r from-transparent via-slate-600/60 to-transparent mb-2`} />

            {/* ─── Navigation ─── */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 py-1">

                {userRole === 'ADMIN' && (
                    <>
                        <SectionLabel label="Administration" />
                        <NavItem to="/admin" icon={Users} label="Employee Directory" />
                        <NavItem to="/org-tree" icon={Network} label="Org Hierarchy" />
                    </>
                )}

                {userRole === 'CFO' && (
                    <>
                        <SectionLabel label="Overview" />
                        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                        <NavItem to="/org-tree" icon={Network} label="Org Hierarchy" />
                        <NavItem to="/tasks" icon={CheckSquare} label="Accounts Team Tasks" />
                        <SectionLabel label="Analytics" />
                        <NavItem to="/reports" icon={BarChart3} label="Reports & Insights" />
                    </>
                )}

                {(userRole === 'MANAGER' || userRole === 'EMPLOYEE') && (
                    <>
                        <SectionLabel label="Workspace" />
                        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                        <NavItem to="/tasks?mode=personal" icon={CheckSquare} label="My Tasks" />

                        {userRole === 'MANAGER' && (
                            <>
                                <SectionLabel label="Team Management" />
                                <NavItem to="/tasks?mode=team" icon={Users} label="Team Tasks" />
                                <SectionLabel label="Analytics" />
                                <NavItem to="/reports" icon={BarChart3} label="Reports & Insights" />
                            </>
                        )}
                    </>
                )}
            </nav>

            {/* ─── User Card ─── */}
            <div className={`m-3 rounded-2xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm ${isCollapsed ? 'p-2 flex flex-col items-center gap-3' : 'p-4'}`}>
                {/* Avatar + Info */}
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 mb-3'}`}>
                    <div className={`
                        flex-shrink-0 rounded-full font-bold text-sm text-white
                        flex items-center justify-center shadow-inner border border-white/10
                        bg-gradient-to-br ${roleGradient}
                        ${isCollapsed ? 'w-9 h-9' : 'w-9 h-9'}
                    `} title={user.name}>
                        {(user.name || 'U').charAt(0).toUpperCase()}
                    </div>

                    {!isCollapsed && (
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold truncate text-slate-200 leading-tight">{user.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full bg-emerald-400`} />
                                <p className="text-[10px] text-slate-400 truncate">{user.role} · {user.department || 'All Depts'}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Logout */}
                <button
                    onClick={logout}
                    title="Sign Out"
                    className={`
                        flex items-center justify-center gap-2.5 w-full rounded-xl
                        text-xs font-semibold py-3 px-3
                        text-white bg-rose-600/90
                        hover:bg-rose-600 border border-rose-500/20
                        transition-all duration-300 active:scale-95 shadow-lg shadow-rose-900/40
                        mt-4
                    `}
                >
                    <LogOut size={16} />
                    {!isCollapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
