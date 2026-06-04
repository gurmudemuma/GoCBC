// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECTA Portal Page

import React from 'react';
import Head from 'next/head';
import ECTAPortal from '@/components/portals/ECTAPortal';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ECTAPortalPage() {
  return (
    <ProtectedRoute allowedRoles={['ECTA', 'ADMIN']}>
      <Head>
        <title>ECTA Portal - CECBS</title>
        <meta name="description" content="Ethiopian Coffee & Tea Authority Portal" />
      </Head>
      <ECTAPortal />
    </ProtectedRoute>
  );
}
