// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECTA Portal - Tab Configuration
// Defines the hierarchical tab structure for ECTA Portal

import React from 'react';
import {
  Assignment,
  CheckCircle,
  Science,
  Assessment,
  Refresh,
  Person,
  Timeline,
  DirectionsBoat,
  Description,
  Coffee,
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

export const getECTATabStructure = (userRole: string): TabCategory[] => {
  const isSuperAdmin = userRole === 'ADMIN';
  
  const tabStructure: TabCategory[] = [
    {
      id: 'registration',
      label: 'Registration & Licensing',
      icon: React.createElement(Assignment),
      roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Registration Officer', 'License Officer'],
      children: [
        {
          id: 'pending-applications',
          label: 'Pending Applications',
          icon: <Assignment />,
          roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Registration Officer'],
          tabIndex: 0,
        },
        {
          id: 'approved-exporters',
          label: 'Approved Exporters',
          icon: <CheckCircle />,
          roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Registration Officer'],
          tabIndex: 1,
        },
        {
          id: 'license-renewals',
          label: 'License Renewals',
          icon: <Refresh />,
          roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'License Officer'],
          tabIndex: 4,
        },
      ],
    },
    {
      id: 'compliance',
      label: 'Compliance & Quality',
      icon: React.createElement(Science),
      roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Quality Officer', 'Compliance Officer'],
      children: [
        {
          id: 'contract-approval',
          label: 'Contract Approval',
          icon: <Description />,
          roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Compliance Officer'],
          tabIndex: 2,
        },
        {
          id: 'quality-control',
          label: 'Quality Control',
          icon: <Science />,
          roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Quality Officer'],
          tabIndex: 3,
        },
        {
          id: 'pre-shipment-inspection',
          label: 'Pre-Shipment Inspection',
          icon: <DirectionsBoat />,
          roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Quality Officer'],
          tabIndex: 6,
        },
        {
          id: 'post-delivery-audits',
          label: 'Post-Delivery Audits',
          icon: <Coffee />,
          roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Quality Officer'],
          tabIndex: 9,
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: React.createElement(Assessment),
      roles: ['ECTA', 'ADMIN', 'ECTA Officer'],
      children: [
        {
          id: 'analytics-dashboard',
          label: 'Analytics Dashboard',
          icon: <Assessment />,
          roles: ['ECTA', 'ADMIN', 'ECTA Officer'],
          tabIndex: 5,
        },
        {
          id: 'audit-trail',
          label: 'Audit Trail',
          icon: <Timeline />,
          roles: ['ECTA', 'ADMIN', 'ECTA Officer'],
          tabIndex: 8,
        },
      ],
    },
    {
      id: 'system',
      label: 'System Management',
      icon: React.createElement(Person),
      roles: ['ADMIN', 'ECTA', 'ECTA Portal Administrator'],
      children: [
        {
          id: 'user-management',
          label: 'User Management',
          icon: <Person />,
          roles: ['ADMIN', 'ECTA', 'ECTA Portal Administrator'],
          tabIndex: 7,
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

export default getECTATabStructure;
