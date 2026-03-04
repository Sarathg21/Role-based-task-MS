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
            setNotifications(res.data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
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
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <header className="navbar">
            <div className="flex items-center gap-4 w-96">
                <div className="input-wrapper w-full">
                    <Search className="input-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search tasks, employees..."
                        className="form-input"
                        style={{ backgroundColor: 'var(--bg-body)' }}
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-slate-500 hover:text-primary hover:bg-violet-50 rounded-full transition-all"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 max-h-96 overflow-hidden flex flex-col">
                            <div className="px-4 py-2 border-b border-slate-200">
                                <h3 className="text-sm font-medium text-slate-800">Notifications</h3>
                                <p className="text-xs text-slate-500">{unreadCount} unread</p>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {notifications.length === 0 ? (
                                    <p className="px-4 py-6 text-sm text-slate-500 text-center">No notifications</p>
                                ) : (
                                    notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => !n.read && markAsRead(n.id)}
                                            className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-l-2 ${n.read ? 'border-transparent opacity-60' : 'border-violet-500 bg-violet-50/50'}`}
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
                                                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                                                    <p className="text-xs text-slate-600 line-clamp-2">{n.message}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <div className="px-4 py-2 border-t border-slate-200 flex justify-between items-center">
                                    <button
                                        onClick={markAllRead}
                                        className="text-[10px] text-violet-600 hover:text-violet-800 font-bold uppercase tracking-wider"
                                    >
                                        Mark all as read
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-4 pl-6 border-l border-slate-200 hover:opacity-80 transition-opacity"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-800 leading-tight">{user?.department}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{user?.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100 shadow-sm">
                        <User size={20} />
                    </div>
                </button>
            </div>
        </header>
    );
};

export default Navbar;
