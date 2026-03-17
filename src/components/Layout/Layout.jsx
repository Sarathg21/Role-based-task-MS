import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Close mobile sidebar on route change
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [location.pathname]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (isMobileSidebarOpen) {
            document.body.classList.add('body-locked');
        } else {
            document.body.classList.remove('body-locked');
        }
        return () => document.body.classList.remove('body-locked');
    }, [isMobileSidebarOpen]);

    if (!user) return <Outlet />;

    return (
        <div className="app-container">
            {/* Mobile overlay backdrop */}
            <div
                className={`sidebar-overlay ${isMobileSidebarOpen ? 'visible' : ''}`}
                onClick={() => setIsMobileSidebarOpen(false)}
            />

            <Sidebar
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isMobileOpen={isMobileSidebarOpen}
                closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
            />
            <div className={`content-column ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <Navbar
                    onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                    isMobileSidebarOpen={isMobileSidebarOpen}
                />
                <main className="main-layout">
                    <div className="page-container">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;