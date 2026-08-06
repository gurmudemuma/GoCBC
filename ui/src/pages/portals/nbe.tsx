// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// NBE Portal Page

import React from 'react';
import Head from 'next/head';
import NBEPortal from '@/components/portals/NBEPortal';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function NBEPortalPage() {
  return (
    <ProtectedRoute allowedRoles={[
      'NBE', 
      'ADMIN',
      'NBE Officer',
      'Forex Officer',
      'Screening Officer',
      'Compliance Officer',
      'Exchange Rate Officer',
      'Settlement Officer'
    ]}>
      <Head>
        <title>NBE Portal - CECBS</title>
        <meta name="description" content="National Bank of Ethiopia Portal" />
      </Head>
      <NBEPortal />
    </ProtectedRoute>
  );
}
