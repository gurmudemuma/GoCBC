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
        // CRITICAL: Check if user is rejected - redirect to resubmit page ONLY
        if (user.status === 'rejected') {
          router.replace('/resubmit-application');
          return;
        }

        // Authenticated → redirect to user's portal
        const portalRoutes: Record<string, string> = {
          ECTA: '/portals/ecta',
          ECX: '/portals/ecx',
          NBE: '/portals/nbe',
          BANKS: '/portals/banks',
          CUSTOMS: '/portals/customs',
          SHIPPING: '/portals/shipping',
          EXPORTER: '/portals/exporter',
          ADMIN: '/admin', // Super Admin Portal
          
          // ECTA sub-roles
          'Quality Inspector': '/portals/ecta',
          'Lab Analyst': '/portals/ecta',
          'Phytosanitary Officer': '/portals/ecta',
          'License Officer': '/portals/ecta',
          'Permit Officer': '/portals/ecta',
          'ECTA Officer': '/portals/ecta',
          
          // ECX sub-roles
          'Grading Officer': '/portals/ecx',
          'Warehouse Officer': '/portals/ecx',
          'Registration Officer': '/portals/ecx',
          'Release Officer': '/portals/ecx',
          'ECX Officer': '/portals/ecx',
          
          // NBE sub-roles
          'NBE Officer': '/portals/nbe',
          'Forex Officer': '/portals/nbe',
          'Screening Officer': '/portals/nbe',
          'Compliance Officer': '/portals/nbe',
          'Exchange Rate Officer': '/portals/nbe',
          'Settlement Officer': '/portals/nbe',
          
          // BANKS sub-roles
          'Bank Officer': '/portals/banks',
          'Branch Manager': '/portals/banks',
          'Trade Finance Officer': '/portals/banks',
          'Credit Analyst': '/portals/banks',
          'LC Officer': '/portals/banks',
          
          // CUSTOMS sub-roles
          'Customs Officer': '/portals/customs',
          'Inspection Officer': '/portals/customs',
          'Clearance Officer': '/portals/customs',
          'Risk Analyst': '/portals/customs',
          'ASYCUDA Officer': '/portals/customs',
          'Duty Assessment Officer': '/portals/customs',
          
          // SHIPPING sub-roles
          'Logistics Officer': '/portals/shipping',
          'Documentation Officer': '/portals/shipping',
          'Operations Manager': '/portals/shipping',
          'Shipping Coordinator': '/portals/shipping',
          'Freight Forwarder': '/portals/shipping',
        };
        
        const targetPortal = portalRoutes[user.role] || '/portals/ecta';
        router.replace(targetPortal);
      }
    }
  }, [isAuthenticated, user, loading, router]);

  // Show loading while checking authentication
  return <LoadingScreen message={isAuthenticated ? "Loading your portal..." : "Redirecting to login..."} />;
}
