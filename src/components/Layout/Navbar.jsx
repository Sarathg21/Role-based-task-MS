import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, Search, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

// Mock data removed in favor of backend API

const Navbar = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [loading, setLoading] = useState(false);
    const notifRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            // Backend might return { notifications: [...] } or direct array
            const data = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
            setNotifications(data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
            setNotifications([]);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Auto-refresh notifications every 30 seconds
        const pollInterval = setInterval(fetchNotifications, 30000);

        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            clearInterval(pollInterval);
        };
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.post(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => (n.id === id || n.notification_id === id) ? { ...n, is_read: true, read: true } : n));
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    // API returns is_read field (not 'read')
    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const unreadCount = safeNotifications.filter(n => !(n.is_read || n.read)).length;

    return (
        <header className="navbar">
            <div className="flex-1 max-w-sm">
                <div className="flex items-center gap-4 px-6 py-3.5 rounded-2xl border border-slate-200/60 transition-all bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-500/10 focus-within:border-violet-400/50 group shadow-inner">
                    <Search
                        className="text-slate-400 group-focus-within:text-violet-500 transition-colors shrink-0"
                        size={20}
                        strokeWidth={1.5}
                    />
                    <input
                        type="text"
                        placeholder="Search for tasks, analytics or staff..."
                        className="w-full bg-transparent border-none focus:outline-none text-sm font-semibold placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative p-2.5 rounded-xl transition-all duration-200 ${showNotifications
                            ? 'bg-violet-100 text-violet-600'
                            : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'
                            } ${unreadCount > 0 ? 'badge-pulse' : ''}`}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white px-0.5 animate-bounce">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div
                            className="absolute right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100/80 z-50 flex flex-col animate-scale-in"
                            style={{ width: '360px', maxHeight: '440px' }}
                        >
                            {/* Header */}
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bell size={15} className="text-violet-500" />
                                    <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                                </div>
                                {unreadCount > 0 && (
                                    <span className="text-xs font-bold text-white bg-violet-500 px-2 py-0.5 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>

                            {/* List */}
                            <div className="overflow-y-auto flex-1 px-2 py-2 space-y-1" style={{ maxHeight: '340px' }}>
                                {safeNotifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                                        <Bell size={28} className="text-slate-300" />
                                        <p className="text-sm text-slate-400 font-medium">You're all caught up!</p>
                                    </div>
                                ) : (
                                    safeNotifications.map((n, idx) => {
                                        const isRead = n.is_read || n.read;
                                        return (
                                            <div
                                                key={n.id || n.notification_id || idx}
                                                onClick={() => !isRead && markAsRead(n.id || n.notification_id)}
                                                className={`flex gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 ${!isRead
                                                    ? 'bg-violet-50/70 hover:bg-violet-50 border border-violet-100/50'
                                                    : 'hover:bg-slate-50 opacity-60 hover:opacity-90'
                                                    }`}
                                            >
                                                {/* Type icon */}
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.type === 'SUCCESS' ? 'bg-emerald-100' :
                                                    n.type === 'WARNING' ? 'bg-amber-100' : 'bg-blue-100'
                                                    }`}>
                                                    {n.type === 'SUCCESS' ? (
                                                        <CheckCircle size={14} className="text-emerald-600" />
                                                    ) : n.type === 'WARNING' ? (
                                                        <AlertCircle size={14} className="text-amber-600" />
                                                    ) : (
                                                        <Bell size={14} className="text-blue-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm leading-tight ${!isRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
                                                        {n.title || n.subject || 'Notification'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message || n.body || ''}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                                    </p>
                                                </div>
                                                {!isRead && (
                                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-violet-500 mt-1.5" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            {safeNotifications.length > 0 && (
                                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex justify-between items-center">
                                    <span className="text-xs text-slate-400">{safeNotifications.length} total</span>
                                    <button
                                        onClick={markAllRead}
                                        className="text-xs text-violet-600 hover:text-violet-800 font-bold transition-colors"
                                    >
                                        Mark all as read
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

                <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2.5 pl-1 group transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-violet-600 transition-colors">
                            {user?.name || 'My Profile'}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                            {user?.role}
                        </p>
                    </div>
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white group-hover:ring-violet-200 transition-all shrink-0">
                        {(user?.name || 'U').charAt(0).toUpperCase()}
                        <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-white" />
                    </div>
                </button>
            </div>
        </header>
    );
};

export default Navbar;
