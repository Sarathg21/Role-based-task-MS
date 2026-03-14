import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, Search, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';

const Navbar = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);

    const [searchTerm, setSearchTerm] = useState('');
    const location = useLocation();
    const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
    const roleUpper = (user?.role || '').toUpperCase();

    const [fromDate, setFromDate] = useState(localStorage.getItem('dashboard_from_date') || '');
    const [toDate, setToDate] = useState(localStorage.getItem('dashboard_to_date') || '');

    useEffect(() => {
        localStorage.setItem('dashboard_from_date', fromDate);
        localStorage.setItem('dashboard_to_date', toDate);
        window.dispatchEvent(new Event('dashboard-filter-change'));
    }, [fromDate, toDate]);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await api.get('/notifications');
            const raw = res.data;
            // Handle every possible backend shape:
            // [], { notifications: [] }, { data: [] }, { items: [] }, { results: [] }, { records: [] }
            let data = [];
            if (Array.isArray(raw)) {
                data = raw;
            } else if (raw && typeof raw === 'object') {
                data = raw.notifications ?? raw.data ?? raw.items ?? raw.results ?? raw.records ?? [];
                if (!Array.isArray(data)) data = [];
            }
            setNotifications(data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const pollInterval = setInterval(fetchNotifications, 30000);

        const handleRefresh = () => fetchNotifications();
        window.addEventListener('refresh-notifications', handleRefresh);

        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('focus', fetchNotifications);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('focus', fetchNotifications);
            window.removeEventListener('refresh-notifications', handleRefresh);
            clearInterval(pollInterval);
        };
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await api.post(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => {
                const nId = String(n.id || n.notification_id || '');
                return nId === String(id) ? { ...n, is_read: true, read: true } : n;
            }));
        } catch (err) {
            console.error('Failed to mark notification as read', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const unreadCount = safeNotifications.filter(n => !(n.is_read || n.read || n.isRead)).length;

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            navigate(`/tasks?search=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm('');
        }
    };

    return (
        <header className="navbar cfo-navbar sticky top-0 bg-white/100 backdrop-blur-md z-40 border-b border-slate-100 flex items-center justify-between px-6 py-4">
            {/* Left Side: Title (logo only for CFO/Admin) */}
            <div className="flex items-center gap-4 w-[400px]">
                {['CFO', 'ADMIN'].includes(roleUpper) && (
                    <div className="w-10 h-10 shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex items-center justify-center">
                        <img src="/images/fj.png.png" alt="FJ Group" className="w-8 h-8 object-contain" />
                    </div>
                )}
                <div className="flex flex-col">
                    <h1 className="text-[17px] font-bold text-slate-900 leading-tight tracking-tight">
                        {(() => {
                            const role = roleUpper;
                            if (role === 'CFO') {
                                if (location.pathname === '/reports') return 'CFO Reports';
                                if (location.pathname === '/tasks/team') return 'CFO Team Tasks';
                                return 'CFO Dashboard';
                            }
                            if (role === 'ADMIN') return 'Admin Control';
                            if (role === 'MANAGER') return 'Manager Hub';
                            if (location.pathname === '/dashboard' || location.pathname === '/') return 'Employee Dashboard';
                            return 'My Task';
                        })()}
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 leading-none mt-1">
                        {user?.role === 'CFO' ? 'Monitor Work Execution & Business Performance' : 
                         'Enterprise Resource & Task Management System'}
                    </p>
                </div>
            </div>

            {/* Center Side: Search Bar - Hidden for CFO */}
            {roleUpper !== 'CFO' ? (
                <div className={`flex-1 max-w-4xl flex items-center gap-4`}>
                    <div className="cfo-search flex items-center gap-3 px-6 py-2.5 rounded-full border border-slate-200 transition-all bg-slate-50/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-400/20 shadow-sm w-full mx-auto">
                        <Search className="text-slate-400 shrink-0" size={20} strokeWidth={2.4} />
                        <input
                            type="text"
                            placeholder="Search for tasks or employees..."
                            className="w-full bg-transparent border-none focus:outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>
                </div>
            ) : (
                <div className="flex-1" />
            )}

            {/* Right Side: Notifications & Profile */}
            <div className="flex items-center gap-4 shrink-0 justify-end">

                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => {
                            const newState = !showNotifications;
                            setShowNotifications(newState);
                            if (newState) fetchNotifications();
                        }}
                        className={`relative p-2.5 rounded-xl transition-all duration-200 ${showNotifications ? 'bg-violet-100 text-violet-600' : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'}`}
                    >
                        <Bell size={19} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full border border-white px-0.5 animate-pulse">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100/80 z-50 flex flex-col animate-scale-in" style={{ width: '360px', maxHeight: '440px' }}>
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bell size={15} className="text-violet-500" />
                                    <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                                </div>
                                {unreadCount > 0 && <span className="text-xs font-bold text-white bg-violet-500 px-2 py-0.5 rounded-full">{unreadCount} new</span>}
                            </div>

                            <div className="overflow-y-auto flex-1 px-2 py-2 space-y-1" style={{ maxHeight: '340px' }}>
                                {safeNotifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                                        <Bell size={28} className="text-slate-300" />
                                        <p className="text-sm text-slate-400 font-medium">No new activity</p>
                                    </div>
                                ) : (
                                    safeNotifications.map((n, idx) => {
                                        const isRead = n.is_read || n.read || n.isRead;
                                        return (
                                            <div
                                                key={n.id || n.notification_id || idx}
                                                onClick={() => !isRead && markAsRead(n.id || n.notification_id)}
                                                className={`flex gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 ${!isRead ? 'bg-violet-50/70 hover:bg-violet-50 border border-violet-100/50' : 'hover:bg-slate-50 opacity-60 hover:opacity-90'}`}
                                            >
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.type === 'SUCCESS' ? 'bg-emerald-100' : n.type === 'WARNING' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                                    {n.type === 'SUCCESS' ? <CheckCircle size={14} className="text-emerald-600" /> : <AlertCircle size={14} className={n.type === 'WARNING' ? 'text-amber-600' : 'text-blue-600'} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[10px] font-bold text-slate-400">{n.title || n.subject || 'Notification'}</span>
                                                        <span className="text-[9px] text-slate-400">{n.time || (n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Just now')}</span>
                                                    </div>
                                                    <p className={`text-[11px] leading-tight ${!isRead ? 'text-slate-800 font-bold' : 'text-slate-500 font-medium'}`}>
                                                        {(() => {
                                                            const title = n.task_title ? <span className="font-bold text-violet-600">"{n.task_title}"</span> : <span className="italic">this task</span>;
                                                            const actor = <span className="font-bold text-slate-800">{n.actor_name || 'Manager'}</span>;
                                                            switch (n.type) {
                                                                case 'TASK_CREATED':
                                                                case 'TASK_REASSIGNED':
                                                                    return <>Task {title} assigned to you</>;
                                                                case 'TASK_STARTED':
                                                                    return <>You started task {title}</>;
                                                                case 'TASK_SUBMITTED':
                                                                    return <>You submitted task {title}</>;
                                                                case 'TASK_REWORK':
                                                                    return <>{actor} requested rework on task {title}</>;
                                                                case 'TASK_APPROVED':
                                                                    return <>Task {title} approved</>;
                                                                case 'TASK_CANCELLED':
                                                                    return <>Task {title} cancelled</>;
                                                                default:
                                                                    return <>{actor} {n.message}</>;
                                                            }
                                                        })()}
                                                    </p>
                                                    {n.comment && <span className="block text-[10px] text-slate-400 mt-1 italic pl-2 border-l-2 border-slate-100">"{n.comment}"</span>}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {safeNotifications.length > 0 && (
                                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex justify-between items-center">
                                    <span className="text-xs text-slate-400">{safeNotifications.length} total</span>
                                    <button onClick={markAllRead} className="text-xs text-violet-600 hover:text-violet-800 font-bold transition-colors">Mark all as read</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-white transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] shadow-sm group"
                >
                    {user?.gender?.toLowerCase() === 'female' ? (
                        <UserFemale size={18} className="text-violet-600" />
                    ) : (
                        <User size={18} className="text-violet-600" />
                    )}
                    <span className="text-[13px] font-bold text-slate-700 leading-none group-hover:text-violet-600 transition-colors tracking-tight">{user?.name || 'AP Exec 1'}</span>
                </button>
            </div>
        </header >
    );
};

const User = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
);

const UserFemale = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
        <path d="m11 12-2 4h6l-2-4" />
        <path d="M9 16l-1 5h8l-1-5" />
    </svg>
);

export default Navbar;
