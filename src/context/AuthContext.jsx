import { createContext, useState, useEffect, useContext } from 'react';
import { USERS } from '../data/mockData';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check localStorage for persisted session
        const storedUser = localStorage.getItem('pms_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (id, password, selectedRole) => {
        const foundUser = USERS.find(u =>
            u.id.toUpperCase() === id.trim().toUpperCase() &&
            u.password === password
        );

        if (!foundUser) {
            return { success: false, message: 'Invalid Credentials' };
        }

        if (!foundUser.active) {
            return { success: false, message: 'Account Deactivated' };
        }

        if (foundUser.role !== selectedRole && selectedRole !== '') {
            // Optional: Strictly enforce role or allow login if credentials match but role differs (usually stricter)
            // For this app, let's enforce role matching if UI sends it
            return { success: false, message: `User is not a ${selectedRole}` };
        }

        localStorage.setItem('pms_user', JSON.stringify(foundUser));
        setUser(foundUser);
        return { success: true };
    };

    const logout = () => {
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
