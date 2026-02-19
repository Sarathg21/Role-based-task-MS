import { useAuth } from '../context/AuthContext';
import { USERS } from '../data/mockData';
import { User, Briefcase, Building2, Mail, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const manager = user?.managerId ? USERS.find(u => u.id === user.managerId) : null;

    if (!user) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-medium text-slate-800">My Profile</h1>
                    <p className="text-sm text-slate-500">View your account details</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                            <User size={32} />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-slate-800">{user.name}</h2>
                            <p className="text-sm text-slate-500">{user.id}</p>
                            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700">
                                {user.role}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Building2 size={18} className="text-slate-500" />
                        <div>
                            <p className="text-xs text-slate-500">Department</p>
                            <p className="text-sm font-medium text-slate-800">{user.department}</p>
                        </div>
                    </div>

                    {manager && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Briefcase size={18} className="text-slate-500" />
                            <div>
                                <p className="text-xs text-slate-500">Reporting Manager</p>
                                <p className="text-sm font-medium text-slate-800">{manager.name}</p>
                                <p className="text-xs text-slate-500">{manager.department}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Mail size={18} className="text-slate-500" />
                        <div>
                            <p className="text-xs text-slate-500">Employee ID</p>
                            <p className="text-sm font-medium text-slate-800">{user.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
