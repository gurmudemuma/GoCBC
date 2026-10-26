import React from 'react';
import {
  LocalShipping,
  Security,
  Warning,
  CheckCircle,
  Cancel,
  DirectionsBoat,
  Person,
  Assessment,
} from '@mui/icons-material';
import { TabConfig } from '../../shared/StandardPortalLayout';

/**
 * Customs Portal Tab Configuration
 * 
 * Hierarchical structure:
 * - Clearance Operations (Submitted, Inspecting, Under Review, Cleared, Rejected)
 * - Border Management (Border Crossing)
 * - System (User Management, Audit Trail)
 */

export const customsTabConfig: TabConfig[] = [
  {
    id: 'submitted',
    label: 'Submitted',
    icon: <LocalShipping sx={{ fontSize: 20 }} />,
    roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer'],
    category: 'Clearance Operations',
    index: 0,
  },
  {
    id: 'inspecting',
    label: 'Inspecting',
    icon: <Security sx={{ fontSize: 20 }} />,
    roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer', 'Inspection Officer'],
    category: 'Clearance Operations',
    index: 1,
  },
  {
    id: 'under-review',
    label: 'Under Review',
    icon: <Warning sx={{ fontSize: 20 }} />,
    roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer', 'Clearance Officer'],
    category: 'Clearance Operations',
    index: 2,
  },
  {
    id: 'cleared',
    label: 'Cleared',
    icon: <CheckCircle sx={{ fontSize: 20 }} />,
    roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer', 'Clearance Officer'],
    category: 'Clearance Operations',
    index: 3,
  },
  {
    id: 'rejected',
    label: 'Rejected',
    icon: <Cancel sx={{ fontSize: 20 }} />,
    roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer'],
    category: 'Clearance Operations',
    index: 4,
  },
  {
    id: 'border-crossing',
    label: 'Border Crossing',
    icon: <DirectionsBoat sx={{ fontSize: 20 }} />,
    roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer', 'Border Officer', 'Inspection Officer'],
    category: 'Border Management',
    index: 5,
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: <Person sx={{ fontSize: 20 }} />,
    roles: ['ADMIN', 'CUSTOMS', 'CUSTOMS Portal Administrator'],
    category: 'System',
    index: 6,
  },
  {
    id: 'audit-trail',
    label: 'Audit Trail',
    icon: <Assessment sx={{ fontSize: 20 }} />,
    roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer', 'Inspection Officer', 'Clearance Officer'],
    category: 'System',
    index: 7,
  },
];

/**
 * Get role-filtered tabs for Customs Portal
 */
export const getRoleBasedTabs = (userRole: string): TabConfig[] => {
  const isSuperAdmin = userRole === 'ADMIN';
  if (isSuperAdmin) return customsTabConfig;
  return customsTabConfig.filter(tab => tab.roles.includes(userRole));
};

/**
 * Get parent categories for hierarchical tab display
 */
export const getTabCategories = (): string[] => {
  return Array.from(new Set(customsTabConfig.map(tab => tab.category)));
};

/**
 * Get tabs by category
 */
export const getTabsByCategory = (category: string): TabConfig[] => {
  return customsTabConfig.filter(tab => tab.category === category);
};
