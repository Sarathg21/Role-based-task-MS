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

        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
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
            <div className="flex items-center gap-3 flex-1 max-w-xs">
                <div className="relative w-full">
                    <input
                        type="text"
                        placeholder="Search tasks, employees..."
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm transition-all bg-slate-50 hover:bg-white"
                        style={{ fontSize: '0.875rem' }}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-slate-500 hover:text-primary hover:bg-violet-50 rounded-full transition-all"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white px-0.5">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 flex flex-col pt-1" style={{ width: '340px', maxHeight: '420px', overflowY: 'hidden' }}>
                            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                                <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">{unreadCount} unread</span>
                            </div>
                            <div className="overflow-y-auto flex-1 px-2 space-y-1 pb-2">
                                {safeNotifications.length === 0 ? (
                                    <p className="px-4 py-6 text-sm text-slate-500 text-center">No notifications</p>
                                ) : (
                                    safeNotifications.map((n) => (
                                        <div
                                            key={n.id || n.notification_id || Math.random()}
                                            onClick={() => !(n.is_read || n.read) && markAsRead(n.id || n.notification_id)}
                                            className={`px-3 py-3 rounded-xl cursor-pointer transition-all ${!(n.is_read || n.read)
                                                ? 'bg-violet-50/60 hover:bg-violet-50'
                                                : 'hover:bg-slate-50 opacity-70 hover:opacity-100'
                                                }`}
                                        >
                                            <div className="flex gap-2">
                                                {n.type === 'SUCCESS' ? (
                                                    <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                                ) : n.type === 'WARNING' ? (
                                                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                                ) : (
                                                    <Bell size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">{n.title || n.subject || 'Notification'}</p>
                                                    <p className="text-xs text-slate-600 line-clamp-2">{n.message || n.body || ''}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {safeNotifications.length > 0 && (
                                <div className="px-5 py-3 border-t border-slate-100 flex justify-center items-center bg-slate-50 rounded-b-2xl mt-1">
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

                <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-3 pl-2 group transition-all"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-violet-600 transition-colors">{user?.name || 'My Profile'}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{user?.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 border-2 border-white ring-1 ring-slate-100 shadow-sm shrink-0 group-hover:ring-violet-200 transition-all">
                        <User size={20} />
                    </div>
                </button>
            </div>
        </header>
    );
};

export default Navbar;
