import React from 'react';
import {
  CurrencyExchange,
  TrendingUp,
  FlightTakeoff,
  Gavel,
  Assessment,
  Person,
  CheckCircle,
  Timeline,
} from '@mui/icons-material';
import { TabConfig } from '../../shared/StandardPortalLayout';

/**
 * NBE Portal Tab Configuration
 * 
 * Hierarchical structure:
 * - Forex Operations (Monitoring, Repatriation)
 * - Market Management (Exchange Rates, SWIFT Monitoring)
 * - Compliance (Policy & Compliance)
 * - Analytics & Reports
 * - System (User Management, Audit Trail)
 */

export const nbeTabConfig: TabConfig[] = [
  {
    id: 'forex-monitoring',
    label: 'Forex Monitoring',
    icon: <CurrencyExchange sx={{ fontSize: 20 }} />,
    roles: ['NBE', 'ADMIN', 'NBE Officer', 'Forex Officer', 'Exchange Rate Officer'],
    category: 'Forex Operations',
    index: 0,
  },
  {
    id: 'forex-repatriation',
    label: 'Forex Repatriation',
    icon: <CheckCircle sx={{ fontSize: 20 }} />,
    roles: ['NBE', 'ADMIN', 'NBE Officer', 'Forex Officer', 'Settlement Officer'],
    category: 'Forex Operations',
    index: 7,
  },
  {
    id: 'exchange-rates',
    label: 'Exchange Rates',
    icon: <TrendingUp sx={{ fontSize: 20 }} />,
    roles: ['NBE', 'ADMIN', 'NBE Officer', 'Exchange Rate Officer'],
    category: 'Market Management',
    index: 1,
  },
  {
    id: 'swift-monitoring',
    label: 'SWIFT Monitoring',
    icon: <FlightTakeoff sx={{ fontSize: 20 }} />,
    roles: ['NBE', 'ADMIN', 'NBE Officer', 'Settlement Officer'],
    category: 'Market Management',
    index: 2,
  },
  {
    id: 'policy-compliance',
    label: 'Policy & Compliance',
    icon: <Gavel sx={{ fontSize: 20 }} />,
    roles: ['NBE', 'ADMIN', 'NBE Officer', 'Compliance Officer', 'Screening Officer'],
    category: 'Compliance',
    index: 3,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <Assessment sx={{ fontSize: 20 }} />,
    roles: ['NBE', 'ADMIN', 'NBE Officer'],
    category: 'Analytics & Reports',
    index: 4,
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: <Person sx={{ fontSize: 20 }} />,
    roles: ['ADMIN', 'NBE', 'NBE Portal Administrator'],
    category: 'System',
    index: 5,
  },
  {
    id: 'audit-trail',
    label: 'Audit Trail',
    icon: <Timeline sx={{ fontSize: 20 }} />,
    roles: ['NBE', 'ADMIN', 'NBE Officer', 'Forex Officer', 'Exchange Rate Officer', 'Settlement Officer', 'Compliance Officer'],
    category: 'System',
    index: 6,
  },
];

/**
 * Get role-filtered tabs for NBE Portal
 */
export const getRoleBasedTabs = (userRole: string): TabConfig[] => {
  const isSuperAdmin = userRole === 'ADMIN';
  if (isSuperAdmin) return nbeTabConfig;
  return nbeTabConfig.filter(tab => tab.roles.includes(userRole));
};

/**
 * Get parent categories for hierarchical tab display
 */
export const getTabCategories = (): string[] => {
  return Array.from(new Set(nbeTabConfig.map(tab => tab.category)));
};

/**
 * Get tabs by category
 */
export const getTabsByCategory = (category: string): TabConfig[] => {
  return nbeTabConfig.filter(tab => tab.category === category);
};
