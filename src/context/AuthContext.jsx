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

    const login = (id, password) => {
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

        // Implicitly set role from user data
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
