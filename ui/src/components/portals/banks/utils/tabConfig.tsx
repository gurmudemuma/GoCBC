import React from 'react';
import {
  Payment,
  CurrencyExchange,
  Description,
  AttachMoney,
  AccountBalance,
  CheckCircle,
  Assessment,
  Person,
  Error,
} from '@mui/icons-material';
import { TabConfig } from '../../shared/StandardPortalLayout';

/**
 * Banks Portal Tab Configuration
 * 
 * Hierarchical structure:
 * - Payment Operations (Payment Methods, Forex Allocations, Document Examination, Payment Release)
 * - International Banking (SWIFT Messages, LC Settlements, LC Discrepancies)
 * - Analytics & Reports
 * - System (User Management, Audit Trail)
 */

export const banksTabConfig: TabConfig[] = [
  {
    id: 'payment-methods',
    label: 'Payment Methods',
    icon: <Payment sx={{ fontSize: 20 }} />,
    roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'LC Officer', 'Payment Officer'],
    category: 'Payment Operations',
    index: 0,
  },
  {
    id: 'forex-allocations',
    label: 'Forex Allocations',
    icon: <CurrencyExchange sx={{ fontSize: 20 }} />,
    roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'Forex Officer'],
    category: 'Payment Operations',
    index: 1,
  },
  {
    id: 'document-examination',
    label: 'Document Examination',
    icon: <Description sx={{ fontSize: 20 }} />,
    roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'Document Officer'],
    category: 'Payment Operations',
    index: 2,
  },
  {
    id: 'payment-release',
    label: 'Payment Release',
    icon: <AttachMoney sx={{ fontSize: 20 }} />,
    roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'Payment Officer'],
    category: 'Payment Operations',
    index: 3,
  },
  {
    id: 'swift-messages',
    label: 'SWIFT Messages',
    icon: <AccountBalance sx={{ fontSize: 20 }} />,
    roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'SWIFT Officer'],
    category: 'International Banking',
    index: 4,
  },
  {
    id: 'lc-settlements',
    label: 'LC Settlements',
    icon: <CheckCircle sx={{ fontSize: 20 }} />,
    roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'LC Officer', 'Payment Officer'],
    category: 'International Banking',
    index: 5,
  },
  {
    id: 'lc-discrepancies',
    label: 'LC Discrepancies',
    icon: <Error sx={{ fontSize: 20 }} />,
    roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'LC Officer', 'Document Officer'],
    category: 'International Banking',
    index: 9,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <Assessment sx={{ fontSize: 20 }} />,
    roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer'],
    category: 'Analytics & Reports',
    index: 6,
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: <Person sx={{ fontSize: 20 }} />,
    roles: ['ADMIN', 'BANKS', 'BANKS Portal Administrator'],
    category: 'System',
    index: 7,
  },
  {
    id: 'audit-trail',
    label: 'Audit Trail',
    icon: <Assessment sx={{ fontSize: 20 }} />,
    roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'LC Officer', 'Payment Officer', 'Forex Officer', 'SWIFT Officer', 'Document Officer'],
    category: 'System',
    index: 8,
  },
];

/**
 * Get role-filtered tabs for Banks Portal
 */
export const getRoleBasedTabs = (userRole: string): TabConfig[] => {
  const isSuperAdmin = userRole === 'ADMIN';
  if (isSuperAdmin) return banksTabConfig;
  return banksTabConfig.filter(tab => tab.roles.includes(userRole));
};

/**
 * Get parent categories for hierarchical tab display
 */
export const getTabCategories = (): string[] => {
  return Array.from(new Set(banksTabConfig.map(tab => tab.category)));
};

/**
 * Get tabs by category
 */
export const getTabsByCategory = (category: string): TabConfig[] => {
  return banksTabConfig.filter(tab => tab.category === category);
};
