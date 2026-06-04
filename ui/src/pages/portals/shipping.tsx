// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shipping Portal Page

import React from 'react';
import Head from 'next/head';
import ShippingPortal from '@/components/portals/ShippingPortal';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ShippingPortalPage() {
  return (
    <ProtectedRoute allowedRoles={['SHIPPING', 'ADMIN']}>
      <Head>
        <title>Shipping Portal - CECBS</title>
        <meta name="description" content="Maritime Logistics & Container Tracking Portal" />
      </Head>
      <ShippingPortal />
    </ProtectedRoute>
  );
}
