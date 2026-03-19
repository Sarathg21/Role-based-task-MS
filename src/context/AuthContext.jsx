import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Role mapping: backend sends uppercase (MANAGER, EMPLOYEE, CFO, ADMIN)
    // frontend expects title-case (Manager, Employee, CFO, Admin)
    const normalizeRole = (role) => {
        const map = { MANAGER: 'Manager', EMPLOYEE: 'Employee', CFO: 'CFO', ADMIN: 'Admin' };
        return map[role?.toUpperCase()] || role;
    };

    const normalizeUser = (u) => ({
        id: u.emp_id || u.id,           // backend uses emp_id
        name: u.name,
        email: u.email || '',
        role: normalizeRole(u.role),
        department: u.department_id || u.department || '',
        manager_id: u.manager_emp_id || u.manager_id || null,
        active: u.active,
        gender: u.gender || 'male',    // Default to 'male' if not provided
    });

    // Restore and validate session from localStorage on app start
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('pms_token');
            const savedUser = localStorage.getItem('pms_user');
            if (token && savedUser) {
                try {
                    // Validate the token is still good
                    const res = await api.get('/auth/me');
                    setUser(normalizeUser(res.data));
                } catch {
                    // Token expired or invalid — clear it silently
                    localStorage.removeItem('pms_token');
                    localStorage.removeItem('pms_user');
                }
            }
            setLoading(false);
        };
        init();
    }, []);


    const login = async (empId, password) => {
        try {
            const res = await api.post('/auth/login-json', {
                emp_id: empId.trim(),
                password,
            });

            const { access_token } = res.data;

            // Store token first so subsequent requests are authenticated
            localStorage.setItem('pms_token', access_token);

            // The login endpoint only returns {access_token, token_type} — fetch profile via /auth/me
            const meRes = await api.get('/auth/me');
            const normalizedUser = normalizeUser(meRes.data);

            // Persist user profile
            localStorage.setItem('pms_user', JSON.stringify(normalizedUser));
            setUser(normalizedUser);

            return { success: true, role: normalizedUser.role };
        } catch (err) {
            // Clean up token if /auth/me failed after storing it
            localStorage.removeItem('pms_token');
            localStorage.removeItem('pms_user');
            
            console.error(`[AuthContext] Login Error:`, err);
            const status = err.response ? err.response.status : 'NO_RESPONSE';
            const data = err.response ? err.response.data : 'NO_DATA';
            console.error(`[AuthContext] Details: Status ${status}, Data:`, data);
            
            const message = err.response?.data?.detail || 'Login failed. Check your credentials.';
            return { success: false, message };
        }
    };

    const logout = () => {
        localStorage.removeItem('pms_token');
        localStorage.removeItem('pms_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
