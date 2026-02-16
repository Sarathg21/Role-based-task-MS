import { useAuth } from '../context/AuthContext';
import EmployeeDashboard from '../components/Dashboard/EmployeeDashboard';
import ManagerDashboard from '../components/Dashboard/ManagerDashboard';
import AdminDashboard from '../components/Dashboard/AdminDashboard';

const DashboardPage = () => {
    const { user } = useAuth();

    const renderDashboard = () => {
        switch (user?.role) {
            case 'Employee':
                return <EmployeeDashboard />;
            case 'Manager':
                return <ManagerDashboard />;
            case 'Admin':
                return <AdminDashboard />;
            default:
                return <div>Unknown Role</div>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-slate-500">Welcome back, {user?.name}</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
            {renderDashboard()}
        </div>
    );
};

export default DashboardPage;
