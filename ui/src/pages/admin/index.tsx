// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Admin Portal Page - Super Admin Dashboard

import React from 'react';
import Head from 'next/head';
import AdminPortal from '@/components/admin/AdminPortal';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPortalPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <Head>
        <title>Admin Portal - CECBS</title>
        <meta name="description" content="System Administrator Portal - Manage All Organizations" />
      </Head>
      <AdminPortal />
    </ProtectedRoute>
  );
}
