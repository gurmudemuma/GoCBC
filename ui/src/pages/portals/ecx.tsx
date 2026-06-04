// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Portal Page

import React from 'react';
import Head from 'next/head';
import ECXPortal from '@/components/portals/ECXPortal';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ECXPortalPage() {
  return (
    <ProtectedRoute allowedRoles={['ECX', 'ADMIN']}>
      <Head>
        <title>ECX Portal - CECBS</title>
        <meta name="description" content="Ethiopian Commodity Exchange Portal" />
      </Head>
      <ECXPortal />
    </ProtectedRoute>
  );
}
