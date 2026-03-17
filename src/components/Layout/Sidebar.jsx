import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    BarChart3,
    LogOut,
    Menu,
    ChevronLeft,
    Network,
    Target,
    Layers,
    RefreshCw,
    TrendingUp,
    X,
} from 'lucide-react';

const Sidebar = ({ isCollapsed, toggleSidebar, isMobileOpen, closeMobileSidebar }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const NavItem = ({ to, icon: Icon, label }) => {
        const active = location.pathname === to || (to.includes('?') && location.pathname + location.search === to);
        return (
            <Link
                to={to}
                title={isCollapsed ? label : ''}
                onClick={closeMobileSidebar}
                className={`
                    cfo-nav-item relative flex items-center
                    transition-all duration-200 group
                    ${isCollapsed ? 'justify-center px-0 mx-2 py-3' : 'gap-3 px-3.5 py-2.5 mx-2.5'}
                    ${active
                        ? 'active text-white'
                        : 'text-indigo-200/60 hover:text-white hover:bg-white/[0.06]'
                    }
                `}
            >
                {/* Active indicator line */}
                {active && !isCollapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-300 rounded-r-full" />
                )}

                <span className={`flex-shrink-0 transition-all ${active ? 'text-white' : 'text-indigo-200/60 group-hover:text-white'}`}>
                    <Icon size={18} strokeWidth={active ? 2.3 : 1.9} />
                </span>

                {!isCollapsed && (
                    <span className="flex-1 text-[13px] font-[580] tracking-[0.005em]">
                        {label}
                    </span>
                )}
            </Link>
        );
    };

    const SectionLabel = ({ label }) => (
        !isCollapsed ? (
            <div className="px-5 pt-5 pb-1.5 text-[9.5px] font-[650] capitalize tracking-[0.14em] text-indigo-200/35 select-none">
                {label}
            </div>
        ) : <div className="h-4" />
    );

    const userRole = (user.role || '').toUpperCase();

    return (
        <aside className={`sidebar cfo-sidebar flex flex-col ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>

            {/* ── Header ── */}
            <div className={`flex items-center px-3 py-4 flex-shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <div className="flex items-center justify-center w-full px-2 py-6 overflow-hidden">
                        <div className="w-24 h-24 shrink-0 rounded-[2.25rem] overflow-hidden flex items-center justify-center bg-white shadow-[0_20px_45px_rgba(79,70,229,0.35)] border-2 border-white/40 p-1.5 transition-transform hover:scale-105 duration-300">
                            <img src="/images/fj.png.png" alt="FJ" className="w-full h-full object-contain drop-shadow-sm" />
                        </div>
                    </div>
                )}

                {isCollapsed && (
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white/10 border border-white/15">
                        <img src="/images/fj.png.png" alt="FJ" className="w-full h-full object-contain" />
                    </div>
                )}

                {/* Desktop toggle button */}
                <button
                    onClick={toggleSidebar}
                    className={`p-1.5 rounded-lg hover:bg-white/10 text-indigo-200/50 hover:text-white transition-all active:scale-95 hidden md:flex ${isCollapsed ? 'mt-2' : 'mr-0.5'}`}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <Menu size={17} /> : <ChevronLeft size={17} />}
                </button>

                {/* Mobile close button */}
                <button
                    onClick={closeMobileSidebar}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-indigo-200/50 hover:text-white transition-all active:scale-95 flex md:hidden mr-0.5"
                    title="Close menu"
                >
                    <X size={17} />
                </button>
            </div>

            {/* ── Divider ── */}
            <div className="mx-3.5 h-px bg-gradient-to-r from-transparent via-indigo-200/15 to-transparent mb-1 flex-shrink-0" />

            {/* ── Nav ── */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1 space-y-0.5">

                {userRole === 'ADMIN' && (
                    <>
                        <SectionLabel label="Administration" />
                        <NavItem to="/admin"      icon={Users}      label="Employee Directory" />
                        <NavItem to="/org-tree"   icon={Network}    label="Org Hierarchy" />
                        <SectionLabel label="Strategy" />
                        <NavItem to="/okr-dashboard"  icon={Target}     label="OKR Dashboard" />
                        <NavItem to="/okr-subtask"    icon={Layers}     label="Sub-task Tracking" />
                        <NavItem to="/recurring-tasks" icon={RefreshCw} label="Recurring Tasks" />
                    </>
                )}

                {userRole === 'CFO' && (
                    <>
                        <SectionLabel label="General" />
                        <NavItem to="/dashboard"    icon={LayoutDashboard} label="Dashboard" />
                        <NavItem to="/performance-dashboard" icon={TrendingUp} label="Performance" />
                        <NavItem to="/tasks/team"   icon={Users}           label="Team Tasks" />
                        <NavItem to="/health-matrix" icon={Network}        label="Health Matrix" />
                        <NavItem to="/reports"      icon={BarChart3}       label="Reports" />
                        <SectionLabel label="Strategic OKRs" />
                        <NavItem to="/okr-dashboard"   icon={Target}     label="OKR Dashboard" />
                        <NavItem to="/okr-subtask"     icon={Layers}     label="Sub-task Tracking" />
                        <NavItem to="/recurring-tasks"  icon={RefreshCw} label="Automated Tasks" />
                    </>
                )}

                {(userRole === 'MANAGER' || userRole === 'EMPLOYEE') && (
                    <>
                        <SectionLabel label="Workspace" />
                        <NavItem to="/dashboard"          icon={LayoutDashboard} label="Dashboard" />
                        <NavItem to="/tasks?mode=personal" icon={CheckSquare}    label="My Tasks" />

                        {userRole === 'MANAGER' && (
                            <>
                                <SectionLabel label="Team Management" />
                                <NavItem to="/tasks/team" icon={Users}    label="Team Tasks" />
                                <SectionLabel label="Analytics" />
                                <NavItem to="/reports"    icon={BarChart3} label="Reports & Insights" />
                            </>
                        )}

                        {userRole === 'EMPLOYEE' && (
                            <>
                                <SectionLabel label="Analytics" />
                                <NavItem to="/reports" icon={BarChart3} label="My Performance" />
                            </>
                        )}
                    </>
                )}
            </nav>

            {/* ── User Panel ── */}
            <div className={`flex-shrink-0 m-2.5 rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-sm ${isCollapsed ? 'p-2' : 'p-3.5'}`}>
                {!isCollapsed ? (
                    <>
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-br from-indigo-400 to-violet-600 border border-white/20 flex items-center justify-center text-white text-xs font-[800]">
                                {(user.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <p className="text-[12.5px] font-[700] text-white truncate leading-tight">{user.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                                    <p className="text-[10px] text-indigo-200/60 truncate">{user.role} · {user.department || 'All Depts'}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center justify-center gap-2 w-full rounded-xl text-[11.5px] font-[650] py-2 px-3 text-indigo-200/80 hover:text-white bg-transparent hover:bg-white/10 border border-white/10 transition-all duration-200 active:scale-95"
                        >
                            <LogOut size={14} />
                            <span>Log Out</span>
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 border border-white/20 flex items-center justify-center text-white text-xs font-[800]" title={user.name}>
                            {(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <button
                            onClick={logout}
                            title="Sign Out"
                            className="p-1.5 rounded-lg text-indigo-200/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
