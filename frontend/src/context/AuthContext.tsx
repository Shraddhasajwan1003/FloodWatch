import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '@/types';
import { login as apiLogin, getMe, logout as apiLogout } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isTrackingGps: boolean;
  setIsTrackingGps: (val: boolean) => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jaldrishti_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTrackingGps, setIsTrackingGps] = useState<boolean>(true); // default true for citizen alert protection

  const refreshUser = async () => {
    if (!localStorage.getItem('jaldrishti_auth_token')) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const u = await getMe();
      setUser(u);
    } catch (e) {
      console.log('Session expired or unauthenticated');
      localStorage.removeItem('jaldrishti_auth_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const handleLogin = async (email: string, pass: string) => {
    const res = await apiLogin(email, pass);
    setUser(res.user);
    setToken(res.access_token);
  };

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isTrackingGps,
        setIsTrackingGps,
        login: handleLogin,
        logout: handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
