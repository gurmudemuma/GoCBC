// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Exporter Dashboard Page

import React from 'react';
import { Box } from '@mui/material';
import Head from 'next/head';
import ExporterPortal from '@/components/portals/ExporterPortal';
import ProtectedRoute from '@/components/ProtectedRoute';

const ExporterPage: React.FC = () => {
  return (
    <ProtectedRoute allowedRoles={['EXPORTER', 'ADMIN']}>
      <Head>
        <title>Exporter Portal - CECBS</title>
        <meta name="description" content="Coffee Exporter Dashboard" />
      </Head>
      
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <ExporterPortal />
      </Box>
    </ProtectedRoute>
  );
};

export default ExporterPage;
