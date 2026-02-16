import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
    const { user } = useAuth();

    if (!user) {
        // If not logged in, just show Outlet (likely Login page)
        // But better is to handle this in App.jsx via ProtectedRoute
        // If we are here and have no user, something is wrong with ProtectedRoutes or we are on public page
        return <Outlet />;
    }

    return (
        <div className="app-container">
            <Sidebar />
            <Navbar />
            <main className="main-layout fade-in">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
