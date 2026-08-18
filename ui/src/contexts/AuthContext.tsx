// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Authentication Context - Unified Login System

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import api from '@/utils/api';
import LoadingScreen from '@/components/LoadingScreen';

export type UserRole = 
  // Primary organization roles
  | 'ECTA' 
  | 'ECX' 
  | 'NBE' 
  | 'BANKS' 
  | 'CUSTOMS' 
  | 'SHIPPING' 
  | 'EXPORTER' 
  | 'ADMIN'
  // ECTA specific roles
  | 'Quality Inspector'
  | 'Lab Analyst'
  | 'Phytosanitary Officer'
  | 'License Officer'
  | 'Permit Officer'
  | 'ECTA Officer'
  // ECX specific roles
  | 'Grading Officer'
  | 'Warehouse Officer'
  | 'Registration Officer'
  | 'Release Officer'
  | 'ECX Officer'
  // NBE specific roles
  | 'NBE Officer'
  | 'Forex Officer'
  | 'Screening Officer'
  | 'Compliance Officer'
  | 'Exchange Rate Officer'
  | 'Settlement Officer'
  // Banks specific roles
  | 'Bank Officer'
  | 'Branch Manager'
  | 'Trade Finance Officer'
  | 'Credit Analyst'
  | 'LC Officer'
  // Customs specific roles
  | 'Customs Officer'
  | 'Inspection Officer'
  | 'Clearance Officer'
  | 'Risk Analyst'
  | 'ASYCUDA Officer'
  | 'Duty Assessment Officer'
  // Shipping specific roles
  | 'Logistics Officer'
  | 'Documentation Officer'
  | 'Operations Manager'
  | 'Shipping Coordinator'
  | 'Freight Forwarder';

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

    // Block inactive applicants from accessing portals
    if (!loading && user && user.status === 'inactive' && user.role === 'EXPORTER') {
      const allowedPaths = ['/application-status', '/login'];
      if (!allowedPaths.includes(router.pathname)) {
        console.warn(`Inactive applicant blocked from accessing ${router.pathname} - redirecting to application status page`);
        router.replace('/application-status');
      }
    }
  }, [user, loading, router.pathname]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      // If we have both token and user data, validate token first
      if (token && storedUser) {
        // Validate token by making a test API call
        try {
          const response = await api.get('/auth/validate', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Token is valid, restore session
          if (response.data.success) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            
            // Check if token is about to expire and refresh it
            checkTokenExpiry(token);
          } else {
            // Token validation failed, clear session
            console.warn('Token validation failed, clearing session');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch (error: any) {
          // Token is invalid (401) - clear it silently
          console.warn('Stored token is invalid or expired, clearing session');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          
          // Don't redirect if user is on login page or landing page - let them login naturally
          // Only redirect if they're trying to access a protected page with an invalid token
          const publicPaths = ['/login', '/', '/register-exporter'];
          if (!publicPaths.includes(router.pathname)) {
            router.push('/login?error=session_expired');
          }
        }
      }
    } catch (error) {
      // Silent failure - just clear invalid data
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
      console.log('Attempting login for user:', username);
      const response = await api.post('/auth/login', { username, password });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error?.message || 'Login failed - invalid response from server');
      }
      
      const { token, user: userData } = response.data.data;
      
      if (!token || !userData) {
        throw new Error('Login failed - missing token or user data');
      }
      
      console.log('Login successful for user:', userData.username, 'Role:', userData.role);
      
      // Store token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Check if user has rejected status - redirect to resubmission page
      if (userData.status === 'rejected') {
        console.log('User has rejected status, redirecting to resubmission page');
        router.push('/resubmit-application');
        return;
      }

      // Check if user is an applicant (EXPORTER with inactive status) - redirect to application status page
      if (userData.role === 'EXPORTER' && userData.status === 'inactive') {
        console.log('User is an applicant with pending application, redirecting to application status page');
        router.push('/application-status');
        return;
      }

      // Redirect directly to appropriate portal based on role
      // Map organization-level roles to their portals
      const getPortalRoute = (role: string): string => {
        // ECTA roles
        if (['ECTA', 'Quality Inspector', 'Lab Analyst', 'Phytosanitary Officer', 'License Officer', 'Permit Officer', 'ECTA Officer'].includes(role)) {
          return '/portals/ecta';
        }
        // ECX roles
        if (['ECX', 'Grading Officer', 'Warehouse Officer', 'Registration Officer', 'Release Officer', 'ECX Officer'].includes(role)) {
          return '/portals/ecx';
        }
        // NBE roles
        if (['NBE', 'NBE Officer', 'Forex Officer', 'Screening Officer', 'Compliance Officer', 'Exchange Rate Officer', 'Settlement Officer'].includes(role)) {
          return '/portals/nbe';
        }
        // Banks roles
        if (['BANKS', 'Bank Officer', 'Branch Manager', 'Trade Finance Officer', 'Credit Analyst', 'LC Officer', 'Forex Officer'].includes(role)) {
          return '/portals/banks';
        }
        // Customs roles
        if (['CUSTOMS', 'Customs Officer', 'Inspection Officer', 'Clearance Officer', 'Risk Analyst', 'ASYCUDA Officer', 'Duty Assessment Officer'].includes(role)) {
          return '/portals/customs';
        }
        // Shipping roles
        if (['SHIPPING', 'Logistics Officer', 'Documentation Officer', 'Operations Manager', 'Shipping Coordinator', 'Freight Forwarder'].includes(role)) {
          return '/portals/shipping';
        }
        // Exporter
        if (role === 'EXPORTER') {
          return '/portals/exporter';
        }
        // Admin
        if (role === 'ADMIN') {
          return '/admin';
        }
        // Default fallback
        return '/portals/ecta';
      };

      // Always redirect to specific portal, never to home
      const roleRoute = getPortalRoute(userData.role);
      console.log('Redirecting to portal:', roleRoute);
      router.push(roleRoute);
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Better error message extraction
      let errorMessage = 'Login failed';
      
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid username or password';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error - please try again later';
      } else if (!error.response) {
        errorMessage = 'Cannot connect to server - please check your connection';
      }
      
      throw new Error(errorMessage);
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
