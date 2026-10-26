import React from 'react';
import {
  CheckCircle,
  LocalShipping,
  Anchor,
  Inventory,
  DirectionsBoat,
  LocationOn,
  Person,
  FlightTakeoff,
} from '@mui/icons-material';
import { TabConfig } from '../../shared/StandardPortalLayout';

/**
 * Shipping Portal Tab Configuration
 * 
 * Hierarchical structure following the shipping lifecycle:
 * - Pre-Departure (Clearance, Land Transport, Port Arrival)
 * - Port Operations (Container Stuffing, Vessel Loading, Departed)
 * - Transit & Delivery (In Transit, Destination Arrived, Delivered)
 * - System (Users)
 */

export const shippingTabConfig: TabConfig[] = [
  {
    id: 'clearance',
    label: 'Clearance',
    icon: <CheckCircle sx={{ fontSize: 20 }} />,
    roles: ['SHIPPING', 'ADMIN', 'SHIPPING Portal Administrator', 'Shipping Officer', 'Logistics Coordinator'],
    category: 'Pre-Departure',
    index: 0,
    metadata: { 
      status: 'CUSTOMS_CLEARED',
      description: 'Customs cleared shipments ready for transport',
      progress: 10,
      color: '#ff9800'
    },
  },
  {
    id: 'land-transport',
    label: 'Land Transport',
    icon: <LocalShipping sx={{ fontSize: 20 }} />,
    roles: ['SHIPPING', 'ADMIN', 'SHIPPING Portal Administrator', 'Shipping Officer', 'Logistics Coordinator', 'Transport Officer'],
    category: 'Pre-Departure',
    index: 1,
    metadata: { 
      status: 'LAND_TRANSPORT',
      description: 'Addis Ababa → Djibouti (800km)',
      progress: 25,
      color: '#2196f3'
    },
  },
  {
    id: 'port-arrival',
    label: 'Port Arrival',
    icon: <Anchor sx={{ fontSize: 20 }} />,
    roles: ['SHIPPING', 'ADMIN', 'SHIPPING Portal Administrator', 'Shipping Officer', 'Port Officer'],
    category: 'Pre-Departure',
    index: 2,
    metadata: { 
      status: 'PORT_ARRIVED',
      description: 'Arrived at Djibouti Port',
      progress: 40,
      color: '#00bcd4'
    },
  },
  {
    id: 'container-stuffing',
    label: 'Container Stuffing',
    icon: <Inventory sx={{ fontSize: 20 }} />,
    roles: ['SHIPPING', 'ADMIN', 'SHIPPING Portal Administrator', 'Shipping Officer', 'Port Officer', 'Warehouse Officer'],
    category: 'Port Operations',
    index: 3,
    metadata: { 
      status: 'CONTAINER_STUFFED',
      description: 'Loading into containers',
      progress: 55,
      color: '#009688'
    },
  },
  {
    id: 'vessel-loading',
    label: 'Vessel Loading',
    icon: <DirectionsBoat sx={{ fontSize: 20 }} />,
    roles: ['SHIPPING', 'ADMIN', 'SHIPPING Portal Administrator', 'Shipping Officer', 'Port Officer'],
    category: 'Port Operations',
    index: 4,
    metadata: { 
      status: 'VESSEL_LOADED',
      description: 'Loaded on ship/aircraft',
      progress: 70,
      color: '#4caf50'
    },
  },
  {
    id: 'departed',
    label: 'Departed',
    icon: <FlightTakeoff sx={{ fontSize: 20 }} />,
    roles: ['SHIPPING', 'ADMIN', 'SHIPPING Portal Administrator', 'Shipping Officer', 'Port Officer'],
    category: 'Port Operations',
    index: 5,
    metadata: { 
      status: 'DEPARTED',
      description: 'Left Djibouti Port',
      progress: 75,
      color: '#8bc34a'
    },
  },
  {
    id: 'in-transit',
    label: 'In Transit',
    icon: <DirectionsBoat sx={{ fontSize: 20 }} />,
    roles: ['SHIPPING', 'ADMIN', 'SHIPPING Portal Administrator', 'Shipping Officer', 'Tracking Officer'],
    category: 'Transit & Delivery',
    index: 6,
    metadata: { 
      status: 'IN_TRANSIT',
      description: 'Ocean/air freight journey',
      progress: 85,
      color: '#673ab7'
    },
  },
  {
    id: 'destination-arrived',
    label: 'Destination Arrived',
    icon: <LocationOn sx={{ fontSize: 20 }} />,
    roles: ['SHIPPING', 'ADMIN', 'SHIPPING Portal Administrator', 'Shipping Officer'],
    category: 'Transit & Delivery',
    index: 7,
    metadata: { 
      status: 'DESTINATION_ARRIVED',
      description: "Arrived at buyer's port",
      progress: 95,
      color: '#3f51b5'
    },
  },
  {
    id: 'delivered',
    label: 'Delivered',
    icon: <CheckCircle sx={{ fontSize: 20 }} />,
    roles: ['SHIPPING', 'ADMIN', 'SHIPPING Portal Administrator', 'Shipping Officer'],
    category: 'Transit & Delivery',
    index: 8,
    metadata: { 
      status: 'DELIVERED',
      description: 'Completed deliveries',
      progress: 100,
      color: '#4caf50'
    },
  },
  {
    id: 'users',
    label: 'Users',
    icon: <Person sx={{ fontSize: 20 }} />,
    roles: ['ADMIN', 'SHIPPING', 'SHIPPING Portal Administrator'],
    category: 'System',
    index: 9,
    metadata: { 
      status: '',
      description: 'User management'
    },
  },
];

/**
 * Get role-filtered tabs for Shipping Portal
 */
export const getRoleBasedTabs = (userRole: string): TabConfig[] => {
  const isSuperAdmin = userRole === 'ADMIN';
  if (isSuperAdmin) return shippingTabConfig;
  return shippingTabConfig.filter(tab => tab.roles.includes(userRole));
};

/**
 * Get parent categories for hierarchical tab display
 */
export const getTabCategories = (): string[] => {
  return Array.from(new Set(shippingTabConfig.map(tab => tab.category)));
};

/**
 * Get tabs by category
 */
export const getTabsByCategory = (category: string): TabConfig[] => {
  return shippingTabConfig.filter(tab => tab.category === category);
};

/**
 * Get lifecycle progress percentage for a status
 */
export const getLifecycleProgress = (status: string): number => {
  const tab = shippingTabConfig.find(t => t.metadata?.status === status);
  return tab?.metadata?.progress || 0;
};

/**
 * Get stage color for a status
 */
export const getStageColor = (status: string): string => {
  const tab = shippingTabConfig.find(t => t.metadata?.status === status);
  return tab?.metadata?.color || '#9e9e9e';
};
