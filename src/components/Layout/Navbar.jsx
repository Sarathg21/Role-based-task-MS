import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, Search, CheckCircle, AlertCircle, ChevronRight, Menu, X } from 'lucide-react';
import api from '../../services/api';

const PAGE_TITLES = {
    '/dashboard':    { title: 'Dashboard',      subtitle: null },
    '/tasks/team':   { title: 'Team Tasks',     subtitle: 'Manage tasks across your team' },
    '/tasks':        { title: 'My Tasks',       subtitle: 'Your active tasks & assignments' },
    '/reports':      { title: 'Reports',        subtitle: 'Analytics & performance insights' },
    '/admin':        { title: 'Admin Control',  subtitle: 'Manage users, roles & permissions' },
    '/org-tree':     { title: 'Org Hierarchy',  subtitle: 'Visualise your organisation tree' },
    '/health-matrix':{ title: 'Health Matrix',  subtitle: 'Department health at a glance' },
    '/okr-dashboard':{ title: 'OKR Dashboard',  subtitle: 'Objectives & key results overview' },
    '/okr-subtask':  { title: 'Sub-task Tracking', subtitle: 'OKR decomposition & progress' },
    '/recurring-tasks':{ title: 'Automated Tasks', subtitle: 'Scheduled & recurring tasks' },
    '/profile':      { title: 'Profile',        subtitle: 'Account settings & preferences' },
};

const ROLE_SUBTITLES = {
    CFO:      'Monitor Work Execution & Business Performance',
    ADMIN:    'Enterprise Resource & Access Management',
    MANAGER:  'Team Oversight & Performance Tracking',
    EMPLOYEE: 'Your personal workspace & task board',
};

const Navbar = ({ onMobileMenuToggle, isMobileSidebarOpen }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileSearch, setShowMobileSearch] = useState(false);

    const roleUpper = (user?.role || '').toUpperCase();
    const pageInfo = PAGE_TITLES[location.pathname] || {};
    const subtitle = pageInfo.subtitle || ROLE_SUBTITLES[roleUpper] || '';
    const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

    const getFirstDayOfMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    };

    const getToday = () => {
        return new Date().toISOString().slice(0, 10);
    };

    const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
    const [toDate, setToDate] = useState(getToday());

    useEffect(() => {
        // We still use localStorage for inter-component communication as a fallback,
        // but we don't treat it as a source of truth across browser refreshes anymore.
        localStorage.setItem('dashboard_from_date', fromDate);
        localStorage.setItem('dashboard_to_date', toDate);
        window.dispatchEvent(new Event('dashboard-filter-change'));
    }, [fromDate, toDate]);

    const isFetchingNotifs = useRef(false);
    const fetchNotifications = async () => {
        if (!user || isFetchingNotifs.current) return;
        isFetchingNotifs.current = true;
        try {
            // Notifications should fail fast if the server is slow
            const res = await api.get('/notifications', { timeout: 10000, params: { limit: 50 } });
            const raw = res.data;
            let data = [];
            if (Array.isArray(raw)) {
                data = raw;
            } else if (raw && typeof raw === 'object') {
                data = raw.notifications ?? raw.data ?? raw.items ?? raw.results ?? raw.records ?? [];
                if (!Array.isArray(data)) data = [];
            }
            // Robust filtering: check for varied flag names and status values
            const filterRead = (n) => {
                const is_read = n.is_read || n.read || n.isRead || n.is_seen || (n.status === 'READ' || n.status === 'SEEN');
                // Cross-check with a local "read" blacklist for immediate consistency after refresh
                const readBlacklist = JSON.parse(localStorage.getItem('read_notifications') || '[]');
                const id = n.id || n.notification_id || n.notificationId || '';
                return !is_read && !readBlacklist.includes(String(id));
            };

            const unreadOnly = data.filter(filterRead);
            setNotifications(unreadOnly);
        } catch (err) {
            // Silence background poll errors unless they are critical auth issues
            if (err.code !== 'ECONNABORTED' && !err.message?.includes('Network Error')) {
                console.error('Failed to fetch notifications', err);
            }
        } finally {
            isFetchingNotifs.current = false;
        }
    };

    useEffect(() => {
        fetchNotifications();
        const poll = setInterval(fetchNotifications, 30000);
        const onRefresh = () => fetchNotifications();
        window.addEventListener('refresh-notifications', onRefresh);

        const handleClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        window.addEventListener('focus', fetchNotifications);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            window.removeEventListener('focus', fetchNotifications);
            window.removeEventListener('refresh-notifications', onRefresh);
            clearInterval(poll);
        };
    }, [user]);

    const markAsRead = async (id) => {
        if (!id) return;
        try {
            // Attempt standard POST, then fall back to generic variations
            try {
                await api.post(`/notifications/${id}/read`);
            } catch (e) {
                // Fallback: try different endpoint formats if the first fails
                try { await api.put(`/notifications/${id}/read`); } catch (e2) {
                    try { await api.post('/notifications/mark-read', { notification_id: id, id }); } catch (e3) {
                         console.warn("Notification mark-read API fallback attempted");
                    }
                }
            }
            
            // Persist locally to ensure it stays "read" even if backend sync is delayed
            const readBlacklist = JSON.parse(localStorage.getItem('read_notifications') || '[]');
            if (!readBlacklist.includes(String(id))) {
                readBlacklist.push(String(id));
                // Keep only last 100 to avoid bloat
                localStorage.setItem('read_notifications', JSON.stringify(readBlacklist.slice(-100)));
            }

            setNotifications(prev =>
                prev.filter(n => String(n.id || n.notification_id || '') !== String(id))
            );
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all');
            
            // Local blacklist update for all current IDs
            const readBlacklist = JSON.parse(localStorage.getItem('read_notifications') || '[]');
            notifications.forEach(n => {
                const id = n.id || n.notification_id || n.notificationId;
                if (id && !readBlacklist.includes(String(id))) readBlacklist.push(String(id));
            });
            localStorage.setItem('read_notifications', JSON.stringify(readBlacklist.slice(-100)));

            setNotifications([]);
        } catch (err) {
            console.error('Failed to mark all read', err);
            // Fallback: empty locally anyway for better UX
            setNotifications([]);
        }
    };

    const handleNotificationClick = async (n) => {
        const id = n.id || n.notification_id || n.notificationId;
        const isRead = n.is_read || n.read || n.isRead;
        
        // Mark as read if it's not already
        if (!isRead) {
            markAsRead(id);
        }

        // Determine target URL based on notification metadata
        const taskId = n.task_id || n.taskId;
        const recurringId = n.recurring_id || n.recurringId;
        const type = String(n.type || '').toUpperCase();
        const msg = String(n.message || n.title || '').toLowerCase();

        let target = '';
        if (taskId) {
            target = `/tasks?id=${taskId}`;
        } else if (recurringId) {
            target = `/recurring-tasks?id=${recurringId}`;
        } else if (msg.includes('recurring') || msg.includes('automation')) {
            target = '/recurring-tasks';
        } else if (msg.includes('task') || msg.includes('directive') || type.includes('TASK')) {
            target = '/tasks';
        }

        setShowNotifications(false);
        if (target) {
            navigate(target);
        }
    };

    const safeNotifs  = Array.isArray(notifications) ? notifications : [];
    const unreadCount = safeNotifs.filter(n => !(n.is_read || n.read || n.isRead)).length;

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            navigate(`/tasks?search=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm('');
            setShowMobileSearch(false);
        }
    };

    return (
        <>
            <header className="navbar cfo-navbar sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4">

                <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
                    {/* Mobile menu toggle */}
                    <button
                        onClick={onMobileMenuToggle}
                        className="p-2 -ml-2 text-slate-400 hover:text-[#6366f1] hover:bg-slate-50 rounded-xl md:hidden transition-all active:scale-95"
                    >
                        {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <div className="flex flex-col min-w-0">
                        <h1
                            className="text-[14px] sm:text-[17px] font-[850] text-[#6366f1] leading-tight tracking-tight truncate pl-1"
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            {(() => {
                                if (roleUpper === 'CFO') {
                                    if (location.pathname === '/reports') return 'CFO Reports';
                                    if (location.pathname === '/task/team' || location.pathname === '/tasks/team') return 'CFO Team Tasks';
                                    return 'CFO Dashboard';
                                }
                                if (roleUpper === 'ADMIN') return 'Admin Control';
                                if (roleUpper === 'MANAGER') return 'Manager Hub';
                                if (isDashboard) return 'Employee Dashboard';
                                return pageInfo.title || 'My Task';
                            })()}
                        </h1>
                        {subtitle && !(roleUpper === 'CFO' && isDashboard) && (
                            <p className="text-[10px] font-[700] text-[#6366f1]/50 mt-0.5 leading-none tracking-[0.08em] uppercase hidden sm:block pl-1">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Center: Search (non-CFO) or Date filters (CFO dashboard) ── */}
                <div className="flex-1 flex items-center justify-center gap-3 max-w-2xl navbar-search-hide-mobile">
                    {roleUpper !== 'CFO' && roleUpper !== 'ADMIN' && location.pathname !== '/departments' ? (
                        <div className="w-full relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" strokeWidth={2.5} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="w-full bg-slate-100/60 border border-slate-100 py-2.5 pl-10 pr-4 rounded-full text-[13px] font-[600] text-slate-600 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-200 transition-all outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearch}
                            />
                        </div>
                    ) : isDashboard && roleUpper === 'CFO' ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-[650] text-slate-400 uppercase tracking-wider whitespace-nowrap">Filter</span>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[12px] font-[600] text-slate-600 cursor-pointer"
                                />
                            </div>
                            <ChevronRight size={12} className="text-slate-300" />
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[12px] font-[600] text-slate-600 cursor-pointer"
                                />
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* ── Right: Search icon (mobile) + Notifications + Profile ── */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

                    {/* Mobile search toggle (non-CFO only) */}
                    {roleUpper !== 'CFO' && roleUpper !== 'ADMIN' && (
                        <button
                            onClick={() => setShowMobileSearch(!showMobileSearch)}
                            className="flex md:hidden p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/60 transition-all"
                        >
                            <Search size={17} strokeWidth={2} />
                        </button>
                    )}

                    {/* Bell */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => {
                                const next = !showNotifications;
                                setShowNotifications(next);
                                if (next) fetchNotifications();
                            }}
                            className={`relative p-2 rounded-xl transition-all duration-200 ${
                                showNotifications
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/60'
                            }`}
                        >
                            <Bell size={18} strokeWidth={2} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-rose-500 text-white text-[9px] font-[800] rounded-full border-2 border-white px-0.5 leading-none">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div
                                className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-[300] flex flex-col animate-scale-in overflow-hidden notif-panel"
                                style={{ width: '340px', maxHeight: '440px' }}
                            >
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                                    <div className="flex items-center gap-2">
                                        <Bell size={14} className="text-indigo-500" />
                                        <span className="text-[13px] font-[750] text-slate-800">Notifications</span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="text-[10px] font-[750] text-white bg-indigo-500 px-2 py-0.5 rounded-full">
                                            {unreadCount} new
                                        </span>
                                    )}
                                </div>

                                <div className="overflow-y-auto flex-1 px-2 py-2 space-y-1" style={{ maxHeight: '340px' }}>
                                    {safeNotifs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                                            <Bell size={26} className="text-slate-200" />
                                            <p className="text-[12px] text-slate-400 font-[600]">No new activity</p>
                                        </div>
                                    ) : (
                                        safeNotifs.map((n, idx) => {
                                            const isRead = n.is_read || n.read || n.isRead;
                                            return (
                                                <div
                                                    key={n.id || n.notification_id || idx}
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`flex gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                                                        !isRead
                                                            ? 'bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-100/60'
                                                            : 'hover:bg-slate-50 opacity-55 hover:opacity-80'
                                                    }`}
                                                >
                                                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                                                        n.type === 'SUCCESS' ? 'bg-emerald-100' : n.type === 'WARNING' ? 'bg-amber-100' : 'bg-indigo-100'
                                                    }`}>
                                                        {n.type === 'SUCCESS'
                                                            ? <CheckCircle size={13} className="text-emerald-600" />
                                                            : <AlertCircle size={13} className={n.type === 'WARNING' ? 'text-amber-600' : 'text-indigo-600'} />
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <span className="text-[10px] font-[700] text-slate-400">{n.title || n.subject || 'Notification'}</span>
                                                            <span className="text-[9px] text-slate-400">{n.time || (n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Just now')}</span>
                                                        </div>
                                                        <p className={`text-[11.5px] leading-snug ${!isRead ? 'text-slate-800 font-[650]' : 'text-slate-500 font-[500]'}`}>
                                                            {n.message || 'Notification received'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {safeNotifs.length > 0 && (
                                    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 flex justify-between items-center">
                                        <span className="text-[10.5px] text-slate-400">{safeNotifs.length} total</span>
                                        <button onClick={markAllRead} className="text-[11px] font-[700] text-indigo-600 hover:text-indigo-800 transition-colors">
                                            Mark all read
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Profile Pill */}
                    <button
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 pr-2 sm:pr-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-xs group active:scale-[0.98]"
                    >
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-[800] shrink-0 shadow-sm">
                            {(user?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[12.5px] font-[700] text-slate-700 group-hover:text-indigo-700 transition-colors leading-none hidden sm:block" style={{ letterSpacing: '-0.01em' }}>
                            {user?.name || 'User'}
                        </span>
                    </button>
                </div>
            </header>

            {/* ── Mobile Search Bar (slides down) ── */}
            {showMobileSearch && roleUpper !== 'CFO' && roleUpper !== 'ADMIN' && (
                <div className="flex md:hidden px-3 py-2 bg-white border-b border-slate-100 shadow-sm z-30 sticky top-[70px]">
                    <div className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <Search size={15} className="text-slate-400 shrink-0" strokeWidth={2.2} />
                        <input
                            type="text"
                            placeholder="Search tasks or employees..."
                            className="w-full bg-transparent border-none outline-none text-[13px] font-[500] text-slate-700 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            autoFocus
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;
