// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Portal - Tab Configuration
// Defines the hierarchical tab structure for ECX Portal

import React from 'react';
import {
  Warehouse,
  Assessment,
  Science,
  TrendingUp,
  Person,
  Coffee,
  Assignment,
} from '@mui/icons-material';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  tabIndex: number;
}

export interface TabCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  children: TabItem[];
}

export const getECXTabStructure = (userRole: string): TabCategory[] => {
  const isSuperAdmin = userRole === 'ADMIN';
  
  const tabStructure: TabCategory[] = [
    {
      id: 'operations',
      label: 'Operations',
      icon: React.createElement(Warehouse),
      roles: ['ECX', 'ADMIN', 'ECX Officer', 'Warehouse Manager', 'Grading Officer'],
      children: [
        {
          id: 'lot-management',
          label: 'Lot Management',
          icon: <Coffee />,
          roles: ['ECX', 'ADMIN', 'ECX Officer', 'Warehouse Manager'],
          tabIndex: 0,
        },
        {
          id: 'grading-standards',
          label: 'Grading Standards',
          icon: <Science />,
          roles: ['ECX', 'ADMIN', 'ECX Officer', 'Grading Officer'],
          tabIndex: 2,
        },
      ],
    },
    {
      id: 'market',
      label: 'Market & Analytics',
      icon: React.createElement(TrendingUp),
      roles: ['ECX', 'ADMIN', 'ECX Officer'],
      children: [
        {
          id: 'market-prices',
          label: 'Market Prices',
          icon: <TrendingUp />,
          roles: ['ECX', 'ADMIN', 'ECX Officer'],
          tabIndex: 1,
        },
      ],
    },
    {
      id: 'system',
      label: 'System',
      icon: React.createElement(Person),
      roles: ['ADMIN', 'ECX', 'ECX Portal Administrator'],
      children: [
        {
          id: 'user-management',
          label: 'User Management',
          icon: <Person />,
          roles: ['ADMIN', 'ECX', 'ECX Portal Administrator'],
          tabIndex: 3,
        },
      ],
    },
  ];
  
  // Filter by role
  if (isSuperAdmin) return tabStructure;
  
  return tabStructure
    .filter(parent => parent.roles.includes(userRole))
    .map(parent => ({
      ...parent,
      children: parent.children.filter(child => child.roles.includes(userRole))
    }))
    .filter(parent => parent.children.length > 0);
};

export default getECXTabStructure;
