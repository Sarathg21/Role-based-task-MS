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
        id: u.id,
        name: u.name,
        role: normalizeRole(u.role),
        department: u.department,
        manager_id: u.manager_id,
        active: u.active,
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

            const { access_token, user: userFromApi } = res.data;
            const normalizedUser = normalizeUser(userFromApi);

            // Persist token and user profile
            localStorage.setItem('pms_token', access_token);
            localStorage.setItem('pms_user', JSON.stringify(normalizedUser));
            setUser(normalizedUser);

            return { success: true };
        } catch (err) {
            const message =
                err.response?.data?.detail || 'Login failed. Check your credentials.';
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

export const useAuth = () => useContext(AuthContext);
