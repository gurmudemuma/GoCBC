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
  status?: string; // 'active', 'inactive', 'suspended', 'rejected'
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
    
    // Set up periodic token refresh (every 20 hours - before 24h expiry)
    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 20 * 60 * 60 * 1000); // 20 hours in milliseconds
    
    return () => clearInterval(refreshInterval);
  }, []); // Only run once on mount

  // Global check: If user is rejected and tries to access any page other than resubmit, redirect
  useEffect(() => {
    if (!loading && user && user.status === 'rejected') {
      const allowedPaths = ['/resubmit-application', '/login'];
      if (!allowedPaths.includes(router.pathname)) {
        console.warn(`Rejected user blocked from accessing ${router.pathname} - redirecting to resubmit page`);
        router.replace('/resubmit-application');
      }
    }
  }, [user, loading, router.pathname]);

  const checkAuth = () => {
    try {
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      // If we have both token and user data, restore session immediately
      if (token && storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        // Check if token is about to expire and refresh it
        checkTokenExpiry(token);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const checkTokenExpiry = (token: string) => {
    try {
      // Decode JWT token (without verification - just to check expiry)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      
      // If token expires in less than 2 hours, refresh it
      if (timeUntilExpiry < 2 * 60 * 60 * 1000) {
        console.log('Token expiring soon, refreshing...');
        refreshToken();
      }
    } catch (error) {
      console.error('Failed to check token expiry:', error);
    }
  };

  const refreshToken = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await api.post('/auth/refresh', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success && response.data.data.token) {
        const newToken = response.data.data.token;
        localStorage.setItem('authToken', newToken);
        console.log('Token refreshed successfully');
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // If refresh fails, user will be logged out on next API call
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

      // Check if user has rejected status - redirect to resubmission page
      if (userData.status === 'rejected') {
        router.push('/resubmit-application');
        return;
      }

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
      const roleRoute = portalRoutes[userData.role as keyof typeof portalRoutes];
      router.push(roleRoute || '/portals/ecta');
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
