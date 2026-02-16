import { useState } from 'react';
import { USERS } from '../data/mockData';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import { Plus, Search, MoreVertical, Trash2, Edit } from 'lucide-react';

const AdminPage = () => {
    const [employees, setEmployees] = useState(USERS);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleStatus = (id) => {
        setEmployees(prev => prev.map(emp =>
            emp.id === id ? { ...emp, active: !emp.active } : emp
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Employee Management</h1>
                    <p className="text-slate-500">Manage system users and access</p>
                </div>
                <Button>
                    <Plus size={18} className="mr-2" />
                    Add Employee
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-primary text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Department</th>
                                <th className="p-4">Reporting Manager</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                            {filteredEmployees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium">{emp.name}</div>
                                                <div className="text-xs text-slate-500">{emp.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">{emp.role}</td>
                                    <td className="p-4">{emp.department}</td>
                                    <td className="p-4">{emp.managerId || '-'}</td>
                                    <td className="p-4">
                                        <Badge variant={emp.active ? 'success' : 'danger'}>
                                            {emp.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className={`p-2 transition-colors ${emp.active ? 'text-slate-400 hover:text-red-500' : 'text-green-500 hover:text-green-600'}`}
                                                onClick={() => handleToggleStatus(emp.id)}
                                                title={emp.active ? 'Deactivate' : 'Activate'}
                                            >
                                                {emp.active ? <Trash2 size={16} /> : <CheckSquare size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-200 text-sm text-slate-500 flex justify-between items-center">
                    <span>Showing {filteredEmployees.length} entries</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" disabled>Previous</Button>
                        <Button variant="secondary" size="sm" disabled>Next</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// I used CheckSquare but didn't import it. Trash2 is imported.
import { CheckSquare } from 'lucide-react'; // Fix import

export default AdminPage;
