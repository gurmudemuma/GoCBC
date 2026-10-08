import React from 'react';
import {
  Assessment,
  Description,
  AccountBalance,
  LocalShipping,
  Assignment,
  AttachMoney,
  TrendingUp,
  Timeline,
} from '@mui/icons-material';
import { TabConfig } from '../../shared/StandardPortalLayout';

/**
 * Exporter Portal Tab Configuration
 * 
 * Hierarchical structure:
 * - Overview (Dashboard)
 * - Export Operations (Contracts, Forex & Banking, Shipments, Customs)
 * - Financial (LC & Payments)
 * - Analytics (Reports, Audit Trail)
 */

export const exporterTabConfig: TabConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Assessment sx={{ fontSize: 20 }} />,
    roles: ['EXPORTER', 'ADMIN', 'EXPORTER Portal Administrator', 'Export Manager', 'Export Officer'],
    category: 'Overview',
    index: 0,
  },
  {
    id: 'my-contracts',
    label: 'My Contracts',
    icon: <Description sx={{ fontSize: 20 }} />,
    roles: ['EXPORTER', 'ADMIN', 'EXPORTER Portal Administrator', 'Export Manager', 'Export Officer', 'Contract Officer'],
    category: 'Export Operations',
    index: 1,
    metadata: {
      blockchain: true,
      description: 'Manage export contracts and agreements'
    },
  },
  {
    id: 'forex-banking',
    label: 'Forex & Banking',
    icon: <AccountBalance sx={{ fontSize: 20 }} />,
    roles: ['EXPORTER', 'ADMIN', 'EXPORTER Portal Administrator', 'Export Manager', 'Finance Officer'],
    category: 'Export Operations',
    index: 2,
    metadata: {
      blockchain: true,
      description: 'Forex allocations and banking operations'
    },
  },
  {
    id: 'shipments',
    label: 'Shipments',
    icon: <LocalShipping sx={{ fontSize: 20 }} />,
    roles: ['EXPORTER', 'ADMIN', 'EXPORTER Portal Administrator', 'Export Manager', 'Export Officer', 'Logistics Officer'],
    category: 'Export Operations',
    index: 3,
    metadata: {
      blockchain: true,
      description: 'Track shipment status and logistics'
    },
  },
  {
    id: 'customs',
    label: 'Customs',
    icon: <Assignment sx={{ fontSize: 20 }} />,
    roles: ['EXPORTER', 'ADMIN', 'EXPORTER Portal Administrator', 'Export Manager', 'Export Officer', 'Customs Liaison'],
    category: 'Export Operations',
    index: 4,
    metadata: {
      description: 'Customs declarations and clearances'
    },
  },
  {
    id: 'lc-payments',
    label: 'LC & Payments',
    icon: <AttachMoney sx={{ fontSize: 20 }} />,
    roles: ['EXPORTER', 'ADMIN', 'EXPORTER Portal Administrator', 'Export Manager', 'Finance Officer'],
    category: 'Financial',
    index: 5,
    metadata: {
      blockchain: true,
      description: 'Letters of Credit and payment tracking'
    },
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <TrendingUp sx={{ fontSize: 20 }} />,
    roles: ['EXPORTER', 'ADMIN', 'EXPORTER Portal Administrator', 'Export Manager'],
    category: 'Analytics',
    index: 6,
    metadata: {
      description: 'Export performance and analytics'
    },
  },
  {
    id: 'audit-trail',
    label: 'Audit Trail',
    icon: <Timeline sx={{ fontSize: 20 }} />,
    roles: ['EXPORTER', 'ADMIN', 'EXPORTER Portal Administrator', 'Export Manager'],
    category: 'Analytics',
    index: 7,
    metadata: {
      description: 'Activity logs and blockchain verification'
    },
  },
];

/**
 * Get role-filtered tabs for Exporter Portal
 */
export const getRoleBasedTabs = (userRole: string): TabConfig[] => {
  const isSuperAdmin = userRole === 'ADMIN';
  if (isSuperAdmin) return exporterTabConfig;
  return exporterTabConfig.filter(tab => tab.roles.includes(userRole));
};

/**
 * Get parent categories for hierarchical tab display
 */
export const getTabCategories = (): string[] => {
  return Array.from(new Set(exporterTabConfig.map(tab => tab.category)));
};

/**
 * Get tabs by category
 */
export const getTabsByCategory = (category: string): TabConfig[] => {
  return exporterTabConfig.filter(tab => tab.category === category);
};
