import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, Search, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const Navbar = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);

    const [searchTerm, setSearchTerm] = useState('');

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await api.get('/notifications');
            let data = [];
            if (Array.isArray(res.data)) data = res.data;
            else if (Array.isArray(res.data?.notifications)) data = res.data.notifications;
            else if (Array.isArray(res.data?.data)) data = res.data.data;
            setNotifications(data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const pollInterval = setInterval(fetchNotifications, 30000);

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
        <header className="navbar cfo-navbar">
            <div className="flex-1 max-w-xl transition-all duration-300 group">
                <div className="cfo-search flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all">
                    <Search className="text-slate-400 group-focus-within:text-violet-500 transition-colors shrink-0" size={18} strokeWidth={1.8} />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        className="w-full bg-transparent border-none focus:outline-none text-sm font-medium placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
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
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white px-0.5">
                                {unreadCount > 99 ? '99+' : unreadCount}
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
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{n.title || n.subject || 'Notification'}</span>
                                                        <span className="text-[9px] text-slate-400">{n.time || (n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Just now')}</span>
                                                    </div>
                                                    <p className={`text-[11px] leading-tight ${!isRead ? 'text-slate-800 font-bold' : 'text-slate-500 font-medium'}`}>{n.message || n.text || n.body}</p>
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
                    className="flex items-center gap-3 px-2 py-1.5 rounded-2xl hover:bg-slate-50 transition-all group active:scale-[0.98]"
                >
                    <div className="relative w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                        <User size={18} className="text-slate-400" />
                    </div>
                    <div className="text-left hidden sm:block">
                        <p className="text-sm font-black text-slate-800 leading-tight">{user?.name || 'John Doe'}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-0.5">{user?.role || 'CFO'}</p>
                    </div>
                    <ChevronDown size={14} className="text-slate-400 ml-1" />
                </button>
            </div>
        </header>
    );
};

const User = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
);

const ChevronDown = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6 9 6 6 6-6" />
    </svg>
);

export default Navbar;
