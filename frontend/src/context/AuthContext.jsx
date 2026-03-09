import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/index.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authApi.me()
            .then((data) => setUser(data.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const login = async (credentials) => {
        const data = await authApi.login(credentials);
        setUser(data.user);
        return data.user;
    };

    const register = async (info) => {
        const data = await authApi.register(info);
        setUser(data.user);
        return data.user;
    };

    const forgotPassword = async (info) => {
        return await authApi.forgotPassword(info);
    };

    const logout = async () => {
        await authApi.logout();
        setUser(null);
    };

    const updateProfile = async (info) => {
        const data = await authApi.updateProfile(info);
        setUser(data.user);
        return data.user;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, forgotPassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
