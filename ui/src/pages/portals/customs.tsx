// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Customs Portal Page

import React from 'react';
import Head from 'next/head';
import CustomsPortal from '@/components/portals/CustomsPortal';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function CustomsPortalPage() {
  return (
    <ProtectedRoute allowedRoles={['CUSTOMS', 'ADMIN']}>
      <Head>
        <title>Customs Portal - CECBS</title>
        <meta name="description" content="Ethiopian Customs Commission Portal" />
      </Head>
      <CustomsPortal />
    </ProtectedRoute>
  );
}
