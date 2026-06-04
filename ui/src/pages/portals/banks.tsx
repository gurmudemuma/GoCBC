// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Banks Portal Page

import React from 'react';
import Head from 'next/head';
import BanksPortal from '@/components/portals/BanksPortal';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function BanksPortalPage() {
  return (
    <ProtectedRoute allowedRoles={['BANKS', 'ADMIN']}>
      <Head>
        <title>Banks Portal - CECBS</title>
        <meta name="description" content="Commercial Banks Export Permit Portal" />
      </Head>
      <BanksPortal />
    </ProtectedRoute>
  );
}
