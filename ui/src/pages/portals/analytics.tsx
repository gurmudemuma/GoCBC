// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Analytics Dashboard Page

import React from 'react';
import Head from 'next/head';
import AnalyticsDashboard from '@/components/portals/AnalyticsDashboard';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AnalyticsPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'NBE', 'ECTA', 'CUSTOMS', 'BANKS', 'SHIPPING', 'ECX', 'EXPORTER']}>
      <Head>
        <title>Analytics Dashboard - CECBS</title>
        <meta name="description" content="Real-time Export Performance & Blockchain Insights" />
      </Head>
      <AnalyticsDashboard />
    </ProtectedRoute>
  );
}
