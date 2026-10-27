import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.ts';
import api from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  quickSwitchAccount: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sltc_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    try {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Failed to load user profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [token]);

  const login = async (email: string, password: string = 'admin123') => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: newTok, user: userData } = res.data;
      localStorage.setItem('sltc_token', newTok);
      setToken(newTok);
      setUser(userData);
    } catch (err: any) {
      setLoading(false);
      throw new Error(err.response?.data?.error || 'Login failed');
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      const { token: newTok, user: userData } = res.data;
      localStorage.setItem('sltc_token', newTok);
      setToken(newTok);
      setUser(userData);
    } catch (err: any) {
      setLoading(false);
      throw new Error(err.response?.data?.error || 'Registration failed');
    }
  };

  const quickSwitchAccount = async (email: string) => {
    const passwordMap: Record<string, string> = {
      'admin@sltcfpdi.edu.ph': 'admin123',
      'faculty@sltcfpdi.edu.ph': 'faculty123',
      'student@sltcfpdi.edu.ph': 'student123',
    };
    const pwd = passwordMap[email] || 'sltc12345';
    await login(email, pwd);
  };

  const logout = () => {
    localStorage.removeItem('sltc_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const refreshProfile = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, quickSwitchAccount, refreshProfile }}>
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
