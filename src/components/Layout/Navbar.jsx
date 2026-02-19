import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, Search, User, CheckCircle, AlertCircle } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
    { id: 1, title: 'Task Approved', message: 'Fix Login Bug has been approved.', time: '2 min ago', read: false, type: 'success' },
    { id: 2, title: 'New Task Assigned', message: 'You have been assigned "API Integration".', time: '1 hour ago', read: false, type: 'info' },
    { id: 3, title: 'Rework Required', message: 'Dashboard Layout needs revisions.', time: '3 hours ago', read: true, type: 'warning' },
];

const Navbar = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

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
                                {MOCK_NOTIFICATIONS.length === 0 ? (
                                    <p className="px-4 py-6 text-sm text-slate-500 text-center">No notifications</p>
                                ) : (
                                    MOCK_NOTIFICATIONS.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-l-2 ${n.read ? 'border-transparent' : 'border-violet-500 bg-violet-50/50'}`}
                                        >
                                            <div className="flex gap-2">
                                                {n.type === 'success' ? (
                                                    <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                                ) : (
                                                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                                                    <p className="text-xs text-slate-600 truncate">{n.message}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {MOCK_NOTIFICATIONS.length > 0 && (
                                <div className="px-4 py-2 border-t border-slate-200">
                                    <button className="text-xs text-violet-600 hover:text-violet-800 font-medium">
                                        View all
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
