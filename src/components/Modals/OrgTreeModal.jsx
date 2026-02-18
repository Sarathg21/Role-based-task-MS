import { X, User, Shield, Briefcase, Network } from "lucide-react";

const OrgNode = ({ user, children }) => {
    // Determine colors based on role
    const getRoleStyles = (role) => {
        switch (role) {
            case 'Admin':
                return 'bg-violet-50 border-violet-200 hover:border-violet-500 shadow-violet-100';
            case 'Manager':
                return 'bg-blue-50 border-blue-200 hover:border-blue-500 shadow-blue-100';
            case 'Employee':
                return 'bg-emerald-50 border-emerald-200 hover:border-emerald-500 shadow-emerald-100';
            default:
                return 'bg-slate-50 border-slate-200 hover:border-slate-500 shadow-slate-100';
        }
    };

    const getIconStyles = (role) => {
        switch (role) {
            case 'Admin':
                return 'bg-violet-100 text-violet-600';
            case 'Manager':
                return 'bg-blue-100 text-blue-600';
            case 'Employee':
                return 'bg-emerald-100 text-emerald-600';
            default:
                return 'bg-slate-100 text-slate-500';
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className={`relative flex flex-col items-center p-4 rounded-xl border-2 shadow-sm hover:shadow-lg transition-all w-48 z-10 ${getRoleStyles(user.role)}`}>
                <div className={`p-3 rounded-full mb-3 ${getIconStyles(user.role)}`}>
                    {user.role === 'Admin' && <Shield size={24} />}
                    {user.role === 'Manager' && <Briefcase size={24} />}
                    {user.role === 'Employee' && <User size={24} />}
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">{user.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${user.role === 'Admin' ? 'text-violet-700 bg-violet-100 border-violet-200' :
                        user.role === 'Manager' ? 'text-blue-700 bg-blue-100 border-blue-200' :
                            'text-emerald-700 bg-emerald-100 border-emerald-200'
                    }`}>
                    {user.role}
                </span>
                <span className="text-[10px] text-slate-500 mt-2 font-medium bg-white/50 px-2 py-0.5 rounded-md">
                    {user.department || 'Management'}
                </span>
            </div>

            {children && children.length > 0 && (
                <div className="flex flex-col items-center">
                    {/* Vertical line from parent to children connector */}
                    <div className="w-px h-8 bg-slate-300"></div>

                    {/* Horizontal connector line */}
                    <div className="relative flex justify-center">
                        {/* Only draw horizontal line if more than 1 child */}
                        {children.length > 1 && (
                            <div className="absolute top-0 left-[50%] -translate-x-1/2 w-[calc(100%-12rem)] h-px bg-slate-300"></div>
                        )}

                        <div className="flex gap-8 pt-0">
                            {children.map((child, index) => (
                                <div key={child.id} className="flex flex-col items-center relative">
                                    {/* Vertical line to child node */}
                                    <div className="w-px h-8 bg-slate-300 absolute -top-8"></div>
                                    <OrgNode user={child.user} children={child.children} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const OrgTreeModal = ({ isOpen, onClose, users }) => {
    if (!isOpen) return null;

    // Build Hierarchy Tree
    const buildTree = () => {
        const admins = users.filter(u => u.role === 'Admin');
        const managers = users.filter(u => u.role === 'Manager');
        const employees = users.filter(u => u.role === 'Employee');

        const tree = admins.map(admin => {
            const adminManagers = managers.filter(m => m.managerId === admin.id || !m.managerId); // Root managers or assigned to admin

            const children = adminManagers.map(mgr => {
                const team = employees.filter(e => e.managerId === mgr.id);
                return {
                    user: mgr,
                    id: mgr.id,
                    children: team.map(emp => ({ user: emp, id: emp.id, children: [] }))
                };
            });

            return {
                user: admin,
                id: admin.id,
                children: children
            };
        });

        return tree;
    };

    const treeData = buildTree();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-20">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Network size={24} className="text-violet-600" /> Organization Hierarchy
                        </h2>
                        <p className="text-sm text-slate-500">Interactive visual flow chart of the organization structure</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-red-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body - Scrollable Area */}
                <div className="flex-1 overflow-auto p-8 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] bg-slate-50 flex justify-center">
                    <div className="min-w-max pb-12 pt-4 scale-90 origin-top">
                        <div className="flex gap-16">
                            {treeData.map(node => (
                                <OrgNode key={node.id} user={node.user} children={node.children} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center text-sm text-slate-600 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
                    <div className="flex gap-6 font-medium">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-violet-500 ring-2 ring-violet-200"></span> Admin
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200"></span> Manager
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span> Employee
                        </div>
                    </div>
                    <div className="font-semibold text-slate-400">
                        Total Staff: {users.length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrgTreeModal;
