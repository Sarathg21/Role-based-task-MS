import { useAuth } from '../../context/AuthContext';
import { Bell, Search, User } from 'lucide-react';

const Navbar = () => {
    const { user } = useAuth();

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
                <button className="relative p-2 text-slate-500 hover:text-primary hover:bg-blue-50 rounded-full transition-all">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-800 leading-tight">{user?.department}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{user?.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                        <User size={20} />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
