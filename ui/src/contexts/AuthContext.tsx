// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Authentication Context - Unified Login System

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import api from '@/utils/api';
import LoadingScreen from '@/components/LoadingScreen';

export type UserRole = 'ECTA' | 'ECX' | 'NBE' | 'BANKS' | 'CUSTOMS' | 'SHIPPING' | 'EXPORTER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  organization: string;
  permissions: string[];
  avatar?: string;
  phone?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth();
  }, []); // Only run once on mount

  const checkAuth = () => {
    try {
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      // If we have both token and user data, restore session immediately
      if (token && storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user: userData } = response.data.data;
      
      // Store token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Redirect directly to appropriate portal based on role
      const portalRoutes: Record<UserRole, string> = {
        ECTA: '/portals/ecta',
        ECX: '/portals/ecx',
        NBE: '/portals/nbe',
        BANKS: '/portals/banks',
        CUSTOMS: '/portals/customs',
        SHIPPING: '/portals/shipping',
        EXPORTER: '/portals/exporter',  // Route exporters to their own portal
        ADMIN: '/portals/ecta', // Default to ECTA portal
      };

      // Always redirect to specific portal, never to home
      router.push(portalRoutes[userData.role] || '/portals/ecta');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false;
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission,
    hasRole,
  };

  // Show professional loading screen while checking authentication
  if (loading) {
    return (
      <AuthContext.Provider value={value}>
        <LoadingScreen message="Authenticating..." />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
