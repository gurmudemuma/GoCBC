// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Protected Route Component

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requirePermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requirePermission,
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only check after loading is complete
    if (loading) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    // Check role-based access
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      console.warn(`Access denied: User role ${user.role} not in allowed roles`, allowedRoles);
      router.replace('/login'); // Redirect to login instead of unauthorized
      return;
    }

    // Check permission-based access
    if (requirePermission && !user.permissions.includes(requirePermission)) {
      console.warn(`Access denied: User missing permission ${requirePermission}`);
      router.replace('/login'); // Redirect to login instead of unauthorized
      return;
    }
  }, [loading, isAuthenticated, user, allowedRoles, requirePermission, router]);

  // Show loading state
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        sx={{ backgroundColor: '#f5f5f5' }}
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 2, color: '#666' }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  // Not authenticated - show nothing (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  // Not authorized - show nothing (will redirect)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  if (requirePermission && !user.permissions.includes(requirePermission)) {
    return null;
  }

  // Authorized - render children immediately
  return <>{children}</>;
};

export default ProtectedRoute;
