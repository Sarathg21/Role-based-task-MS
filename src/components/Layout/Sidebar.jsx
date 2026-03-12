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
} from 'lucide-react';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const NavItem = ({ to, icon: Icon, label }) => {
        const active = location.pathname === to || (to.includes('?') && location.pathname + location.search === to);

        return (
            <Link
                to={to}
                title={isCollapsed ? label : ''}
                className={`
                    cfo-nav-item relative flex items-center gap-3 px-4 py-3 mx-3 rounded-xl
                    text-[13px] font-medium transition-all duration-200 group
                    ${isCollapsed ? 'justify-center px-0 mx-2' : ''}
                    ${active ? 'active text-white shadow-lg shadow-violet-900/25' : 'text-violet-100/70 hover:text-white'}
                `}
            >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full opacity-80" />}
                <span className={`flex-shrink-0 transition-all duration-200 ${active ? 'text-white' : 'text-violet-100/70 group-hover:text-white'} ${isCollapsed && active ? 'bg-white/20 p-1.5 rounded-lg' : ''}`}>
                    <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {!isCollapsed && <span className="flex-1 tracking-wide">{label}</span>}
            </Link>
        );
    };

    const SectionLabel = ({ label }) => (
        !isCollapsed ? (
            <div className="px-7 pt-6 pb-2 text-[10px] font-bold text-violet-100/50 tracking-wider">{label}</div>
        ) : <div className="h-6" />
    );

    const userRole = (user.role || '').toUpperCase();

    return (
        <aside className={`sidebar cfo-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className={`sidebar-header flex items-center ${isCollapsed ? 'justify-center px-0 flex-col gap-4' : 'justify-between'}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3 ml-2'}`}>
                    <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center overflow-hidden rounded-xl">
                        <img src="/images/fj.png.png" alt="FJ Group" className="w-full h-full object-contain" />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <h1 className="text-[16px] font-extrabold tracking-tight text-white whitespace-nowrap">FJ Group</h1>
                            <p className="text-[9px] text-violet-100/60 font-semibold uppercase tracking-widest whitespace-nowrap mt-0.5">Platform for Smarter Work</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={toggleSidebar}
                    className={`p-2 rounded-lg hover:bg-white/10 text-violet-100/60 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 ${isCollapsed ? 'mt-2' : 'mr-1'}`}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                    {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <div className={`${isCollapsed ? 'mx-3' : 'mx-6'} h-px bg-gradient-to-r from-transparent via-violet-100/20 to-transparent mb-2`} />

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
                        <SectionLabel label="General" />
                        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                        <NavItem to="/tasks/team" icon={Users} label="Team Tasks" />
                        <NavItem to="/health-matrix" icon={Network} label="Health Matrix" />
                        <NavItem to="/reports" icon={BarChart3} label="Reports" />
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
                                <NavItem to="/tasks/team" icon={Users} label="Team Tasks" />
                                <SectionLabel label="Analytics" />
                                <NavItem to="/reports" icon={BarChart3} label="Reports & Insights" />
                            </>
                        )}
                    </>
                )}
            </nav>

            <div className={`m-3 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm ${isCollapsed ? 'p-2 flex flex-col items-center gap-3' : 'p-4'}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 mb-3'}`}>
                    <div className="flex-shrink-0 rounded-full font-bold text-sm text-white flex items-center justify-center shadow-inner border border-white/10 bg-gradient-to-br from-violet-500 to-indigo-700 w-9 h-9" title={user.name}>
                        {(user.name || 'U').charAt(0).toUpperCase()}
                    </div>

                    {!isCollapsed && (
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold truncate text-white leading-tight">{user.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <p className="text-[10px] text-violet-100/70 truncate">{user.role} | {user.department || 'All Depts'}</p>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={logout}
                    title="Sign Out"
                    className="flex items-center justify-center gap-2.5 w-full rounded-xl text-xs font-semibold py-3 px-3 text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all duration-300 active:scale-95 mt-4"
                >
                    <LogOut size={16} />
                    {!isCollapsed && <span>Log Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
