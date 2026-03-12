import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

// Pages
// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TaskPage from './pages/TaskPage';
import AssignTaskPage from './pages/AssignTaskPage';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import OrgTreePage from './pages/OrgTreePage';
import TeamTasksPage from './pages/TeamTasksPage';
import DeptHealthMatrixPage from './pages/DeptHealthMatrixPage';
import AccessDeniedPage from './pages/AccessDeniedPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route
            path="dashboard"
            element={
              <ProtectedRoute allowedRoles={['Employee', 'Manager', 'CFO', 'Admin']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="tasks"
            element={
              <ProtectedRoute>
                <TaskPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="tasks/assign"
            element={
              <ProtectedRoute allowedRoles={['Manager', 'Admin', 'CFO']}>
                <AssignTaskPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="tasks/team"
            element={
              <ProtectedRoute allowedRoles={['CFO', 'Admin', 'Manager']}>
                <TeamTasksPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={['Employee', 'Manager', 'Admin', 'CFO']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="admin"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'CFO']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="org-tree"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'CFO']}>
                <OrgTreePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="health-matrix"
            element={
              <ProtectedRoute allowedRoles={['CFO', 'Admin']}>
                <DeptHealthMatrixPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;