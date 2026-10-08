/**
 * Shipping Portal Data Loader
 * 
 * Handles parallel data loading and stats calculation for Shipping Portal
 * Loads shipments across all lifecycle stages from clearance to delivery
 */

import { apiFetch } from '../../../../utils/api';

// ============================================================================
// Type Definitions
// ============================================================================

export type ShippingStatus = 
  | 'CUSTOMS_CLEARED' 
  | 'LAND_TRANSPORT' 
  | 'PORT_ARRIVED' 
  | 'CONTAINER_STUFFED' 
  | 'VESSEL_LOADED' 
  | 'DEPARTED' 
  | 'IN_TRANSIT' 
  | 'DESTINATION_ARRIVED' 
  | 'DELIVERED';

export interface ShippingRecord {
  shipmentId: string;
  contractId: string;
  exporterId: string;
  status: ShippingStatus;
  clearanceDate?: string;
  landTransportStarted?: string;
  portArrivalDate?: string;
  containerStuffingDate?: string;
  vesselLoadingDate?: string;
  departureDate?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  deliveryDate?: string;
  transportMode: 'SEA' | 'AIR' | 'LAND';
  vesselName?: string;
  containerNumber?: string;
  billOfLadingNumber?: string;
  trackingNumber?: string;
  origin: string;
  destination: string;
  currentLocation?: string;
  quantity: number;
  weight: number;
  value: number;
  carrier?: string;
  isDelayed: boolean;
  delayReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingPortalData {
  shipments: ShippingRecord[];
  users: any[];
}

// ============================================================================
// Data Loading Functions
// ============================================================================

/**
 * Load all Shipping Portal data in parallel
 */
export const loadShippingData = async (): Promise<ShippingPortalData> => {
  console.log('[Shipping DataLoader] 🔄 Loading Shipping Portal data...');

  try {
    const [
      shipmentsResponse,
      usersResponse,
    ] = await Promise.all([
      apiFetch('/shipments', { method: 'GET' }),
      apiFetch('/users?organization=SHIPPING', { method: 'GET' }),
    ]);

    // Parse responses
    const shipmentsData = shipmentsResponse.ok ? await shipmentsResponse.json() : { data: [] };
    const usersData = usersResponse.ok ? await usersResponse.json() : { data: [] };

    // Transform shipments
    const shipments: ShippingRecord[] = (shipmentsData.data || []).map((ship: any) => {
      const estimatedArrival = ship.estimatedArrival ? new Date(ship.estimatedArrival) : null;
      const now = new Date();
      const isDelayed = estimatedArrival ? now > estimatedArrival && !ship.actualArrival : false;

      return {
        shipmentId: ship.shipmentId || ship.id || '',
        contractId: ship.contractId || '',
        exporterId: ship.exporterId || '',
        status: ship.status || 'CUSTOMS_CLEARED',
        clearanceDate: ship.clearanceDate || undefined,
        landTransportStarted: ship.landTransportStarted || undefined,
        portArrivalDate: ship.portArrivalDate || undefined,
        containerStuffingDate: ship.containerStuffingDate || undefined,
        vesselLoadingDate: ship.vesselLoadingDate || undefined,
        departureDate: ship.departureDate || undefined,
        estimatedArrival: ship.estimatedArrival || undefined,
        actualArrival: ship.actualArrival || undefined,
        deliveryDate: ship.deliveryDate || undefined,
        transportMode: ship.transportMode || 'SEA',
        vesselName: ship.vesselName || undefined,
        containerNumber: ship.containerNumber || undefined,
        billOfLadingNumber: ship.billOfLadingNumber || ship.bolNumber || undefined,
        trackingNumber: ship.trackingNumber || undefined,
        origin: ship.origin || 'Addis Ababa, Ethiopia',
        destination: ship.destination || ship.destinationPort || '',
        currentLocation: ship.currentLocation || undefined,
        quantity: ship.quantity || 0,
        weight: ship.weight || 0,
        value: ship.value || ship.totalValue || 0,
        carrier: ship.carrier || ship.shippingLine || undefined,
        isDelayed: isDelayed,
        delayReason: ship.delayReason || undefined,
        createdAt: ship.createdAt || new Date().toISOString(),
        updatedAt: ship.updatedAt || new Date().toISOString(),
      };
    });

    console.log('[Shipping DataLoader] ✅ Data loaded:', {
      shipments: shipments.length,
      users: usersData.data?.length || 0,
    });

    return {
      shipments,
      users: usersData.data || [],
    };
  } catch (error) {
    console.error('[Shipping DataLoader] ❌ Error loading data:', error);
    return {
      shipments: [],
      users: [],
    };
  }
};

// ============================================================================
// Stats Calculation Functions
// ============================================================================

/**
 * Calculate stats for all Shipping Portal tabs
 */
export const calculateShippingStats = (data: ShippingPortalData) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const shipmentsByStatus = (status: ShippingStatus) => 
    data.shipments.filter(s => s.status === status);

  return {
    // Tab 0: Clearance
    clearance: {
      ready: shipmentsByStatus('CUSTOMS_CLEARED').filter(s => s.clearanceDate).length,
      preparing: shipmentsByStatus('CUSTOMS_CLEARED').filter(s => !s.clearanceDate).length,
      delayed: shipmentsByStatus('CUSTOMS_CLEARED').filter(s => {
        if (!s.createdAt) return false;
        const daysSinceCreated = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceCreated > 2;
      }).length,
      total: shipmentsByStatus('CUSTOMS_CLEARED').length,
    },

    // Tab 1: Land Transport
    landTransport: {
      inTransit: shipmentsByStatus('LAND_TRANSPORT').length,
      onSchedule: shipmentsByStatus('LAND_TRANSPORT').filter(s => !s.isDelayed).length,
      delayed: shipmentsByStatus('LAND_TRANSPORT').filter(s => s.isDelayed).length,
      avgTransitTime: calculateAvgLandTransitTime(data.shipments),
    },

    // Tab 2: Port Arrival
    portArrival: {
      arrived: shipmentsByStatus('PORT_ARRIVED').filter(s => s.portArrivalDate).length,
      pending: shipmentsByStatus('LAND_TRANSPORT').length, // Still in transit
      todayArrivals: shipmentsByStatus('PORT_ARRIVED').filter(s => 
        s.portArrivalDate && new Date(s.portArrivalDate) >= today
      ).length,
      total: shipmentsByStatus('PORT_ARRIVED').length,
    },

    // Tab 3: Container Stuffing
    containerStuffing: {
      inProgress: shipmentsByStatus('CONTAINER_STUFFED').filter(s => 
        !s.containerStuffingDate || (Date.now() - new Date(s.containerStuffingDate).getTime() < 24 * 60 * 60 * 1000)
      ).length,
      completed: shipmentsByStatus('CONTAINER_STUFFED').filter(s => 
        s.containerStuffingDate && (Date.now() - new Date(s.containerStuffingDate).getTime() >= 24 * 60 * 60 * 1000)
      ).length,
      scheduled: shipmentsByStatus('PORT_ARRIVED').length, // Waiting to be stuffed
      total: shipmentsByStatus('CONTAINER_STUFFED').length,
    },

    // Tab 4: Vessel Loading
    vesselLoading: {
      loading: shipmentsByStatus('VESSEL_LOADED').filter(s => 
        !s.vesselLoadingDate || (Date.now() - new Date(s.vesselLoadingDate).getTime() < 12 * 60 * 60 * 1000)
      ).length,
      loaded: shipmentsByStatus('VESSEL_LOADED').filter(s => 
        s.vesselLoadingDate && (Date.now() - new Date(s.vesselLoadingDate).getTime() >= 12 * 60 * 60 * 1000)
      ).length,
      pending: shipmentsByStatus('CONTAINER_STUFFED').length, // Waiting to be loaded
      total: shipmentsByStatus('VESSEL_LOADED').length,
    },

    // Tab 5: Departed
    departed: {
      todayDepartures: shipmentsByStatus('DEPARTED').filter(s => 
        s.departureDate && new Date(s.departureDate) >= today
      ).length,
      weekDepartures: shipmentsByStatus('DEPARTED').filter(s => 
        s.departureDate && new Date(s.departureDate) >= weekAgo
      ).length,
      onSchedule: shipmentsByStatus('DEPARTED').filter(s => !s.isDelayed).length,
      total: shipmentsByStatus('DEPARTED').length,
    },

    // Tab 6: In Transit
    inTransit: {
      inTransit: shipmentsByStatus('IN_TRANSIT').length,
      onSchedule: shipmentsByStatus('IN_TRANSIT').filter(s => !s.isDelayed).length,
      delayed: shipmentsByStatus('IN_TRANSIT').filter(s => s.isDelayed).length,
      avgDaysRemaining: calculateAvgDaysRemaining(data.shipments),
    },

    // Tab 7: Destination Arrived
    destinationArrived: {
      arrived: shipmentsByStatus('DESTINATION_ARRIVED').length,
      todayArrivals: shipmentsByStatus('DESTINATION_ARRIVED').filter(s => 
        s.actualArrival && new Date(s.actualArrival) >= today
      ).length,
      awaitingClearance: shipmentsByStatus('DESTINATION_ARRIVED').filter(s => 
        !s.deliveryDate
      ).length,
      total: shipmentsByStatus('DESTINATION_ARRIVED').length,
    },

    // Tab 8: Delivered
    delivered: {
      todayDelivered: shipmentsByStatus('DELIVERED').filter(s => 
        s.deliveryDate && new Date(s.deliveryDate) >= today
      ).length,
      weekDelivered: shipmentsByStatus('DELIVERED').filter(s => 
        s.deliveryDate && new Date(s.deliveryDate) >= weekAgo
      ).length,
      onTime: calculateOnTimeRate(data.shipments),
      total: shipmentsByStatus('DELIVERED').length,
    },

    // Tab 9: Users
    users: {
      totalUsers: data.users.length,
      activeUsers: data.users.filter((u: any) => u.status === 'ACTIVE').length,
      admins: data.users.filter((u: any) => 
        u.role === 'ADMIN' || u.role === 'SHIPPING Portal Administrator'
      ).length,
      inactiveUsers: data.users.filter((u: any) => u.status === 'INACTIVE').length,
    },
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateAvgLandTransitTime(shipments: ShippingRecord[]): number {
  const completed = shipments.filter(
    s => s.status === 'PORT_ARRIVED' && s.landTransportStarted && s.portArrivalDate
  );
  
  if (completed.length === 0) return 12; // Default 12 hours for 800km
  
  const totalHours = completed.reduce((sum, s) => {
    const start = new Date(s.landTransportStarted!);
    const end = new Date(s.portArrivalDate!);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);
  
  return Math.round(totalHours / completed.length);
}

function calculateAvgDaysRemaining(shipments: ShippingRecord[]): number {
  const inTransit = shipments.filter(
    s => s.status === 'IN_TRANSIT' && s.estimatedArrival
  );
  
  if (inTransit.length === 0) return 0;
  
  const now = new Date();
  const totalDays = inTransit.reduce((sum, s) => {
    const eta = new Date(s.estimatedArrival!);
    const days = Math.max(0, Math.ceil((eta.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return sum + days;
  }, 0);
  
  return Math.round(totalDays / inTransit.length);
}

function calculateOnTimeRate(shipments: ShippingRecord[]): number {
  const delivered = shipments.filter(
    s => s.status === 'DELIVERED' && s.deliveryDate && s.estimatedArrival
  );
  
  if (delivered.length === 0) return 100;
  
  const onTime = delivered.filter(s => {
    const delivery = new Date(s.deliveryDate!);
    const estimated = new Date(s.estimatedArrival!);
    return delivery <= estimated;
  }).length;
  
  return Math.round((onTime / delivered.length) * 100);
}
