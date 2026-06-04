// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Home Page - Professional Enterprise Flow

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        // Not authenticated → redirect to login
        router.replace('/login');
      } else if (user) {
        // Authenticated → redirect to user's portal
        const portalRoutes: Record<string, string> = {
          ECTA: '/portals/ecta',
          ECX: '/portals/ecx',
          NBE: '/portals/nbe',
          BANKS: '/portals/banks',
          CUSTOMS: '/portals/customs',
          SHIPPING: '/portals/shipping',
          EXPORTER: '/portals/exporter',
          ADMIN: '/portals/ecta',
        };
        
        const targetPortal = portalRoutes[user.role] || '/portals/ecta';
        router.replace(targetPortal);
      }
    }
  }, [isAuthenticated, user, loading, router]);

  // Show loading while checking authentication
  return <LoadingScreen message={isAuthenticated ? "Loading your portal..." : "Redirecting to login..."} />;
}
