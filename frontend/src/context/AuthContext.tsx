import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api.js';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  languageCapabilities: string[];
  assignedTerritories: string[];
  teamLeadId?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      // Always start with loading true and user null
      setUser(null);
      setLoading(true);

      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          // Verify token is still valid by fetching current user with timeout
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth check timeout')), 5000)
          );
          
          const response = await Promise.race([
            authAPI.getCurrentUser(),
            timeoutPromise,
          ]) as any;

          if (response?.success && response?.data?.user) {
            setUser(response.data.user);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            setUser(null);
          }
        } catch (error) {
          // Token invalid or network error, clear storage
          console.error('Auth check failed:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        // No token or user in storage, ensure user is null
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    if (response.success) {
      setUser(response.data.user);
    } else {
      throw new Error('Login failed');
    }
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

