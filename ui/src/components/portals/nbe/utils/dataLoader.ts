/**
 * NBE Portal Data Loader
 * 
 * Handles parallel data loading and stats calculation for NBE Portal
 * Loads forex allocations, exchange rates, SWIFT messages, compliance data
 */

import { apiFetch } from '../../../../utils/api';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ForexAllocation {
  forexId: string;
  contractId: string;
  exporterId: string;
  lcId: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  officialRate: number;
  retentionRate: number;
  status: 'REQUESTED' | 'CONFIRMED' | 'ALLOCATED' | 'EXPIRED' | 'REJECTED';
  requestDate: string;
  approvalDate?: string | null;
  allocationDate?: string | null;
  expiryDate?: string | null;
  nbeOfficer?: string | null;
  nbeApprovalRef?: string | null;
  verifiedBy?: string | null;
  verifiedByMsp?: string | null;
  comments?: string | null;
}

export interface ExchangeRate {
  rateId: string;
  currency: string;
  buyRate: number;
  sellRate: number;
  officialRate: number;
  effectiveDate: string;
  setBy: string;
  status: 'ACTIVE' | 'HISTORICAL';
  notes?: string;
  createdAt: string;
}

export interface SwiftMessage {
  messageId: string;
  messageType: string;
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'FAILED';
  sentDate: string;
  completedDate?: string | null;
  lcId?: string;
  contractId?: string;
  reference: string;
}

export interface ComplianceCheck {
  checkId: string;
  entityType: 'CONTRACT' | 'EXPORTER' | 'FOREX' | 'LC';
  entityId: string;
  checkType: string;
  status: 'COMPLIANT' | 'UNDER_REVIEW' | 'VIOLATION' | 'RESOLVED';
  performedBy: string;
  performedAt: string;
  findings?: string;
  resolution?: string;
}

export interface DeliveredShipment {
  shipmentId: string;
  contractId: string;
  lcId: string;
  exporterId: string;
  deliveryDate: string;
  forexRequired: number;
  forexRepatriated: number;
  status: 'PENDING_REPATRIATION' | 'PARTIAL' | 'COMPLETED' | 'OVERDUE';
  daysOverdue?: number;
}

export interface NBEPortalData {
  forexAllocations: ForexAllocation[];
  exchangeRates: ExchangeRate[];
  swiftMessages: SwiftMessage[];
  complianceChecks: ComplianceCheck[];
  deliveredShipments: DeliveredShipment[];
  contracts: any[];
  users: any[];
}

// ============================================================================
// Data Loading Functions
// ============================================================================

/**
 * Load all NBE Portal data in parallel
 */
export const loadNBEData = async (): Promise<NBEPortalData> => {
  console.log('[NBE DataLoader] 🔄 Loading NBE Portal data...');

  try {
    const [
      forexResponse,
      ratesResponse,
      swiftResponse,
      complianceResponse,
      shipmentsResponse,
      contractsResponse,
      usersResponse,
    ] = await Promise.all([
      apiFetch('/forex', { method: 'GET' }),
      apiFetch('/exchange-rates', { method: 'GET' }),
      apiFetch('/swift-messages', { method: 'GET' }),
      apiFetch('/compliance-checks', { method: 'GET' }),
      apiFetch('/shipments/delivered', { method: 'GET' }),
      apiFetch('/contracts', { method: 'GET' }),
      apiFetch('/users?organization=NBE', { method: 'GET' }),
    ]);

    // Parse responses
    const forexData = forexResponse.ok ? await forexResponse.json() : { data: [] };
    const ratesData = ratesResponse.ok ? await ratesResponse.json() : { data: [] };
    const swiftData = swiftResponse.ok ? await swiftResponse.json() : { data: [] };
    const complianceData = complianceResponse.ok ? await complianceResponse.json() : { data: [] };
    const shipmentsData = shipmentsResponse.ok ? await shipmentsResponse.json() : { data: [] };
    const contractsData = contractsResponse.ok ? await contractsResponse.json() : { data: [] };
    const usersData = usersResponse.ok ? await usersResponse.json() : { data: [] };

    // Transform forex data
    const forexAllocations: ForexAllocation[] = (forexData.data || []).map((forex: any) => ({
      forexId: forex.forexId || '',
      contractId: forex.contractId || '',
      exporterId: forex.exporterId || '',
      lcId: forex.lcId || '',
      requestedAmount: forex.requestedAmount || 0,
      allocatedAmount: forex.allocatedAmount || 0,
      currency: forex.currency || 'USD',
      exchangeRate: forex.exchangeRate || 0,
      officialRate: forex.exchangeRate || 0,
      retentionRate: forex.retentionRate || 0,
      status: forex.status || 'REQUESTED',
      requestDate: forex.requestDate || forex.createdAt || new Date().toISOString(),
      approvalDate: forex.approvalDate || null,
      allocationDate: forex.allocationDate || null,
      expiryDate: forex.expiryDate || null,
      nbeOfficer: forex.nbeOfficer || null,
      nbeApprovalRef: forex.nbeApprovalRef || null,
      verifiedBy: forex.verifiedBy || null,
      verifiedByMsp: forex.verifiedByMsp || null,
      comments: forex.comments || null,
    }));

    // Transform exchange rates
    const exchangeRates: ExchangeRate[] = (ratesData.data || []).map((rate: any) => ({
      rateId: rate.rateId || rate.id || '',
      currency: rate.currency || 'USD',
      buyRate: rate.buyRate || 0,
      sellRate: rate.sellRate || 0,
      officialRate: rate.officialRate || rate.sellRate || 0,
      effectiveDate: rate.effectiveDate || rate.createdAt || new Date().toISOString(),
      setBy: rate.setBy || 'NBE',
      status: rate.status || 'ACTIVE',
      notes: rate.notes || '',
      createdAt: rate.createdAt || new Date().toISOString(),
    }));

    // Transform SWIFT messages
    const swiftMessages: SwiftMessage[] = (swiftData.data || []).map((msg: any) => ({
      messageId: msg.messageId || msg.id || '',
      messageType: msg.messageType || 'MT103',
      sender: msg.sender || '',
      receiver: msg.receiver || '',
      amount: msg.amount || 0,
      currency: msg.currency || 'USD',
      status: msg.status || 'PENDING',
      sentDate: msg.sentDate || msg.createdAt || new Date().toISOString(),
      completedDate: msg.completedDate || null,
      lcId: msg.lcId || '',
      contractId: msg.contractId || '',
      reference: msg.reference || '',
    }));

    // Transform compliance checks
    const complianceChecks: ComplianceCheck[] = (complianceData.data || []).map((check: any) => ({
      checkId: check.checkId || check.id || '',
      entityType: check.entityType || 'CONTRACT',
      entityId: check.entityId || '',
      checkType: check.checkType || '',
      status: check.status || 'UNDER_REVIEW',
      performedBy: check.performedBy || '',
      performedAt: check.performedAt || check.createdAt || new Date().toISOString(),
      findings: check.findings || '',
      resolution: check.resolution || '',
    }));

    // Transform delivered shipments
    const deliveredShipments: DeliveredShipment[] = (shipmentsData.data || []).map((ship: any) => {
      const deliveryDate = new Date(ship.deliveryDate || ship.actualDeliveryDate);
      const today = new Date();
      const daysOverdue = Math.floor((today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        shipmentId: ship.shipmentId || ship.id || '',
        contractId: ship.contractId || '',
        lcId: ship.lcId || '',
        exporterId: ship.exporterId || '',
        deliveryDate: ship.deliveryDate || ship.actualDeliveryDate || new Date().toISOString(),
        forexRequired: ship.forexRequired || ship.totalValue || 0,
        forexRepatriated: ship.forexRepatriated || 0,
        status: ship.forexStatus || (daysOverdue > 30 ? 'OVERDUE' : 'PENDING_REPATRIATION'),
        daysOverdue: daysOverdue > 30 ? daysOverdue : 0,
      };
    });

    console.log('[NBE DataLoader] ✅ Data loaded:', {
      forex: forexAllocations.length,
      rates: exchangeRates.length,
      swift: swiftMessages.length,
      compliance: complianceChecks.length,
      shipments: deliveredShipments.length,
      contracts: contractsData.data?.length || 0,
      users: usersData.data?.length || 0,
    });

    return {
      forexAllocations,
      exchangeRates,
      swiftMessages,
      complianceChecks,
      deliveredShipments,
      contracts: contractsData.data || [],
      users: usersData.data || [],
    };
  } catch (error) {
    console.error('[NBE DataLoader] ❌ Error loading data:', error);
    return {
      forexAllocations: [],
      exchangeRates: [],
      swiftMessages: [],
      complianceChecks: [],
      deliveredShipments: [],
      contracts: [],
      users: [],
    };
  }
};

// ============================================================================
// Stats Calculation Functions
// ============================================================================

/**
 * Calculate stats for all NBE Portal tabs
 */
export const calculateNBEStats = (data: NBEPortalData) => {
  return {
    // Tab 0: Forex Monitoring
    forexMonitoring: {
      pending: data.forexAllocations.filter(f => f.status === 'REQUESTED').length,
      confirmed: data.forexAllocations.filter(f => f.status === 'CONFIRMED').length,
      allocated: data.forexAllocations.filter(f => f.status === 'ALLOCATED').length,
      total: data.forexAllocations.length,
    },

    // Tab 1: Exchange Rates
    exchangeRates: {
      currentRate: data.exchangeRates.find(r => r.status === 'ACTIVE' && r.currency === 'USD')?.officialRate || 115.50,
      dailyChange: calculateDailyChange(data.exchangeRates),
      weeklyAvg: calculateWeeklyAverage(data.exchangeRates),
      totalRates: data.exchangeRates.length,
    },

    // Tab 2: SWIFT Monitoring
    swiftMonitoring: {
      pending: data.swiftMessages.filter(m => m.status === 'PENDING').length,
      inTransit: data.swiftMessages.filter(m => m.status === 'IN_TRANSIT').length,
      completed: data.swiftMessages.filter(m => m.status === 'COMPLETED').length,
      total: data.swiftMessages.length,
    },

    // Tab 3: Policy & Compliance
    policyCompliance: {
      compliant: data.complianceChecks.filter(c => c.status === 'COMPLIANT').length,
      underReview: data.complianceChecks.filter(c => c.status === 'UNDER_REVIEW').length,
      violations: data.complianceChecks.filter(c => c.status === 'VIOLATION').length,
      complianceRate: calculateComplianceRate(data.complianceChecks),
    },

    // Tab 4: Analytics
    analytics: {
      totalExports: data.contracts.length,
      forexVolume: data.forexAllocations.reduce((sum, f) => sum + f.allocatedAmount, 0),
      avgProcessingTime: calculateAvgProcessingTime(data.forexAllocations),
      activeContracts: data.contracts.filter((c: any) => c.status === 'ACTIVE' || c.status === 'APPROVED').length,
    },

    // Tab 5: User Management
    userManagement: {
      totalUsers: data.users.length,
      activeUsers: data.users.filter((u: any) => u.status === 'ACTIVE').length,
      admins: data.users.filter((u: any) => u.role === 'ADMIN' || u.role === 'NBE Portal Administrator').length,
      inactiveUsers: data.users.filter((u: any) => u.status === 'INACTIVE').length,
    },

    // Tab 6: Audit Trail
    auditTrail: {
      totalActivities: 0, // Will be loaded separately from audit endpoint
      todaysActions: 0,
      blockchainVerified: 0,
      organizationsInvolved: 0,
    },

    // Tab 7: Forex Repatriation
    forexRepatriation: {
      pending: data.deliveredShipments.filter(s => s.status === 'PENDING_REPATRIATION').length,
      inProgress: data.deliveredShipments.filter(s => s.status === 'PARTIAL').length,
      completed: data.deliveredShipments.filter(s => s.status === 'COMPLETED').length,
      total: data.deliveredShipments.length,
    },
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDailyChange(rates: ExchangeRate[]): number {
  if (rates.length < 2) return 0;
  
  const sortedRates = rates
    .filter(r => r.currency === 'USD' && r.status === 'ACTIVE')
    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  
  if (sortedRates.length < 2) return 0;
  
  const today = sortedRates[0].officialRate;
  const yesterday = sortedRates[1].officialRate;
  
  return ((today - yesterday) / yesterday) * 100;
}

function calculateWeeklyAverage(rates: ExchangeRate[]): number {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const recentRates = rates.filter(
    r => r.currency === 'USD' && new Date(r.effectiveDate) >= weekAgo
  );
  
  if (recentRates.length === 0) return 115.50;
  
  const sum = recentRates.reduce((acc, r) => acc + r.officialRate, 0);
  return sum / recentRates.length;
}

function calculateComplianceRate(checks: ComplianceCheck[]): number {
  if (checks.length === 0) return 100;
  
  const compliant = checks.filter(c => c.status === 'COMPLIANT' || c.status === 'RESOLVED').length;
  return (compliant / checks.length) * 100;
}

function calculateAvgProcessingTime(allocations: ForexAllocation[]): number {
  const completed = allocations.filter(
    f => f.status === 'ALLOCATED' && f.requestDate && f.allocationDate
  );
  
  if (completed.length === 0) return 0;
  
  const totalDays = completed.reduce((sum, f) => {
    const request = new Date(f.requestDate);
    const allocation = new Date(f.allocationDate!);
    const days = Math.floor((allocation.getTime() - request.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  
  return Math.round(totalDays / completed.length);
}
