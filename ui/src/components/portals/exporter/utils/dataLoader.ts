/**
 * Exporter Portal Data Loader
 * 
 * Handles parallel data loading and stats calculation for Exporter Portal
 * Loads contracts, forex, LCs, shipments, payments, and customs data
 */

import { apiFetch } from '../../../../utils/api';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ExportContract {
  contractId: string;
  buyerId: string;
  buyerName: string;
  buyerCountry: string;
  coffeeType: string;
  quantity: number;
  pricePerKg: number;
  totalValue: number;
  currency: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ECTA_APPROVED' | 'NBE_APPROVED' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  contractDate: string;
  deliveryDeadline: string;
  nbeReferenceNumber?: string;
  ectaLicenseNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForexStatus {
  forexId: string;
  contractId: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  status: 'REQUESTED' | 'CONFIRMED' | 'ALLOCATED' | 'EXPIRED' | 'REJECTED';
  requestDate: string;
  allocationDate?: string;
  expiryDate?: string;
}

export interface LCStatus {
  lcId: string;
  lcNumber: string;
  contractId: string;
  issuingBank: string;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ISSUED' | 'FOREX_BACKED' | 'FOREX_ALLOCATED' | 'UTILIZED' | 'EXPIRED' | 'CLOSED';
  issueDate?: string;
  expiryDate?: string;
  utilizationDate?: string;
}

export interface ShipmentStatus {
  shipmentId: string;
  contractId: string;
  status: 'CUSTOMS_CLEARED' | 'LAND_TRANSPORT' | 'PORT_ARRIVED' | 'CONTAINER_STUFFED' | 'VESSEL_LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'DESTINATION_ARRIVED' | 'DELIVERED';
  quantity: number;
  weight: number;
  value: number;
  destination: string;
  estimatedArrival?: string;
  actualArrival?: string;
  deliveryDate?: string;
  trackingNumber?: string;
  createdAt: string;
}

export interface PaymentStatus {
  paymentId: string;
  contractId: string;
  lcId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  paymentDate?: string;
  paymentMethod: string;
  reference: string;
}

export interface CustomsDeclaration {
  declarationId: string;
  shipmentId: string;
  contractId: string;
  status: 'SUBMITTED' | 'INSPECTING' | 'UNDER_REVIEW' | 'CLEARED' | 'REJECTED' | 'BORDER_CROSSING' | 'CROSSED';
  declarationDate: string;
  clearanceDate?: string;
  rejectionReason?: string;
}

export interface ExporterPortalData {
  contracts: ExportContract[];
  forexStatuses: ForexStatus[];
  lcStatuses: LCStatus[];
  shipments: ShipmentStatus[];
  payments: PaymentStatus[];
  customsDeclarations: CustomsDeclaration[];
}

// ============================================================================
// Data Loading Functions
// ============================================================================

/**
 * Load all Exporter Portal data in parallel
 */
export const loadExporterData = async (exporterId?: string): Promise<ExporterPortalData> => {
  console.log('[Exporter DataLoader] 🔄 Loading Exporter Portal data...');

  try {
    const exporterFilter = exporterId ? `?exporterId=${exporterId}` : '';
    
    const [
      contractsResponse,
      forexResponse,
      lcsResponse,
      shipmentsResponse,
      paymentsResponse,
      customsResponse,
    ] = await Promise.all([
      apiFetch(`/contracts${exporterFilter}`, { method: 'GET' }),
      apiFetch(`/forex${exporterFilter}`, { method: 'GET' }),
      apiFetch(`/lcs${exporterFilter}`, { method: 'GET' }),
      apiFetch(`/shipments${exporterFilter}`, { method: 'GET' }),
      apiFetch(`/payments${exporterFilter}`, { method: 'GET' }),
      apiFetch(`/customs/declarations${exporterFilter}`, { method: 'GET' }),
    ]);

    // Parse responses
    const contractsData = contractsResponse.ok ? await contractsResponse.json() : { data: [] };
    const forexData = forexResponse.ok ? await forexResponse.json() : { data: [] };
    const lcsData = lcsResponse.ok ? await lcsResponse.json() : { data: [] };
    const shipmentsData = shipmentsResponse.ok ? await shipmentsResponse.json() : { data: [] };
    const paymentsData = paymentsResponse.ok ? await paymentsResponse.json() : { data: [] };
    const customsData = customsResponse.ok ? await customsResponse.json() : { data: [] };

    // Transform contracts
    const contracts: ExportContract[] = (contractsData.data || []).map((contract: any) => ({
      contractId: contract.contractId || contract.id || '',
      buyerId: contract.buyerId || '',
      buyerName: contract.buyerName || '',
      buyerCountry: contract.buyerCountry || '',
      coffeeType: contract.coffeeType || '',
      quantity: contract.quantity || 0,
      pricePerKg: contract.pricePerKg || 0,
      totalValue: contract.totalValue || (contract.quantity * contract.pricePerKg) || 0,
      currency: contract.currency || 'USD',
      status: contract.status || 'DRAFT',
      contractDate: contract.contractDate || contract.createdAt || new Date().toISOString(),
      deliveryDeadline: contract.deliveryDeadline || '',
      nbeReferenceNumber: contract.nbeReferenceNumber || undefined,
      ectaLicenseNumber: contract.ectaLicenseNumber || undefined,
      createdAt: contract.createdAt || new Date().toISOString(),
      updatedAt: contract.updatedAt || new Date().toISOString(),
    }));

    // Transform forex
    const forexStatuses: ForexStatus[] = (forexData.data || []).map((forex: any) => ({
      forexId: forex.forexId || forex.id || '',
      contractId: forex.contractId || '',
      requestedAmount: forex.requestedAmount || 0,
      allocatedAmount: forex.allocatedAmount || 0,
      currency: forex.currency || 'USD',
      exchangeRate: forex.exchangeRate || 0,
      status: forex.status || 'REQUESTED',
      requestDate: forex.requestDate || forex.createdAt || new Date().toISOString(),
      allocationDate: forex.allocationDate || undefined,
      expiryDate: forex.expiryDate || undefined,
    }));

    // Transform LCs
    const lcStatuses: LCStatus[] = (lcsData.data || []).map((lc: any) => ({
      lcId: lc.lcId || lc.id || '',
      lcNumber: lc.lcNumber || '',
      contractId: lc.contractId || '',
      issuingBank: lc.issuingBank || '',
      amount: lc.amount || 0,
      currency: lc.currency || 'USD',
      status: lc.status || 'DRAFT',
      issueDate: lc.issueDate || undefined,
      expiryDate: lc.expiryDate || undefined,
      utilizationDate: lc.utilizationDate || undefined,
    }));

    // Transform shipments
    const shipments: ShipmentStatus[] = (shipmentsData.data || []).map((ship: any) => ({
      shipmentId: ship.shipmentId || ship.id || '',
      contractId: ship.contractId || '',
      status: ship.status || 'CUSTOMS_CLEARED',
      quantity: ship.quantity || 0,
      weight: ship.weight || 0,
      value: ship.value || ship.totalValue || 0,
      destination: ship.destination || ship.destinationPort || '',
      estimatedArrival: ship.estimatedArrival || undefined,
      actualArrival: ship.actualArrival || undefined,
      deliveryDate: ship.deliveryDate || undefined,
      trackingNumber: ship.trackingNumber || undefined,
      createdAt: ship.createdAt || new Date().toISOString(),
    }));

    // Transform payments
    const payments: PaymentStatus[] = (paymentsData.data || []).map((payment: any) => ({
      paymentId: payment.paymentId || payment.id || '',
      contractId: payment.contractId || '',
      lcId: payment.lcId || '',
      amount: payment.amount || 0,
      currency: payment.currency || 'USD',
      status: payment.status || 'PENDING',
      paymentDate: payment.paymentDate || undefined,
      paymentMethod: payment.paymentMethod || 'LC',
      reference: payment.reference || payment.swiftReference || '',
    }));

    // Transform customs declarations
    const customsDeclarations: CustomsDeclaration[] = (customsData.data || []).map((customs: any) => ({
      declarationId: customs.declarationId || customs.id || '',
      shipmentId: customs.shipmentId || '',
      contractId: customs.contractId || '',
      status: customs.status || 'SUBMITTED',
      declarationDate: customs.declarationDate || customs.createdAt || new Date().toISOString(),
      clearanceDate: customs.clearanceDate || undefined,
      rejectionReason: customs.rejectionReason || undefined,
    }));

    console.log('[Exporter DataLoader] ✅ Data loaded:', {
      contracts: contracts.length,
      forex: forexStatuses.length,
      lcs: lcStatuses.length,
      shipments: shipments.length,
      payments: payments.length,
      customs: customsDeclarations.length,
    });

    return {
      contracts,
      forexStatuses,
      lcStatuses,
      shipments,
      payments,
      customsDeclarations,
    };
  } catch (error) {
    console.error('[Exporter DataLoader] ❌ Error loading data:', error);
    return {
      contracts: [],
      forexStatuses: [],
      lcStatuses: [],
      shipments: [],
      payments: [],
      customsDeclarations: [],
    };
  }
};

// ============================================================================
// Stats Calculation Functions
// ============================================================================

/**
 * Calculate stats for all Exporter Portal tabs
 */
export const calculateExporterStats = (data: ExporterPortalData) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  return {
    // Tab 0: Dashboard
    dashboard: {
      activeContracts: data.contracts.filter(c => 
        ['APPROVED', 'NBE_APPROVED', 'ACTIVE'].includes(c.status)
      ).length,
      totalValue: data.contracts.filter(c => 
        ['APPROVED', 'NBE_APPROVED', 'ACTIVE'].includes(c.status)
      ).reduce((sum, c) => sum + c.totalValue, 0),
      shipmentsInTransit: data.shipments.filter(s => 
        ['LAND_TRANSPORT', 'PORT_ARRIVED', 'IN_TRANSIT'].includes(s.status)
      ).length,
      pendingPayments: data.payments.filter(p => p.status === 'PENDING').length,
    },

    // Tab 1: My Contracts
    myContracts: {
      draft: data.contracts.filter(c => c.status === 'DRAFT').length,
      pending: data.contracts.filter(c => c.status === 'SUBMITTED').length,
      approved: data.contracts.filter(c => 
        ['ECTA_APPROVED', 'NBE_APPROVED', 'APPROVED'].includes(c.status)
      ).length,
      active: data.contracts.filter(c => c.status === 'ACTIVE').length,
    },

    // Tab 2: Forex & Banking
    forexBanking: {
      pendingForex: data.forexStatuses.filter(f => 
        ['REQUESTED', 'CONFIRMED'].includes(f.status)
      ).length,
      allocatedForex: data.forexStatuses.filter(f => f.status === 'ALLOCATED').length,
      issuedLCs: data.lcStatuses.filter(lc => 
        ['ISSUED', 'FOREX_BACKED', 'FOREX_ALLOCATED', 'UTILIZED'].includes(lc.status)
      ).length,
      totalForexValue: data.forexStatuses.filter(f => f.status === 'ALLOCATED')
        .reduce((sum, f) => sum + f.allocatedAmount, 0),
    },

    // Tab 3: Shipments
    shipments: {
      preparing: data.shipments.filter(s => 
        ['CUSTOMS_CLEARED', 'LAND_TRANSPORT', 'PORT_ARRIVED'].includes(s.status)
      ).length,
      inTransit: data.shipments.filter(s => 
        ['CONTAINER_STUFFED', 'VESSEL_LOADED', 'DEPARTED', 'IN_TRANSIT'].includes(s.status)
      ).length,
      delivered: data.shipments.filter(s => 
        ['DESTINATION_ARRIVED', 'DELIVERED'].includes(s.status)
      ).length,
      total: data.shipments.length,
    },

    // Tab 4: Customs
    customs: {
      pending: data.customsDeclarations.filter(c => 
        ['SUBMITTED', 'INSPECTING', 'UNDER_REVIEW'].includes(c.status)
      ).length,
      cleared: data.customsDeclarations.filter(c => 
        ['CLEARED', 'BORDER_CROSSING', 'CROSSED'].includes(c.status)
      ).length,
      rejected: data.customsDeclarations.filter(c => c.status === 'REJECTED').length,
      total: data.customsDeclarations.length,
    },

    // Tab 5: LC & Payments
    lcPayments: {
      pendingLCs: data.lcStatuses.filter(lc => 
        ['DRAFT', 'SUBMITTED'].includes(lc.status)
      ).length,
      activeLCs: data.lcStatuses.filter(lc => 
        ['ISSUED', 'FOREX_BACKED', 'FOREX_ALLOCATED'].includes(lc.status)
      ).length,
      receivedPayments: data.payments.filter(p => p.status === 'COMPLETED').length,
      totalPaymentValue: data.payments.filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.amount, 0),
    },

    // Tab 6: Reports
    reports: {
      monthlyExports: data.contracts.filter(c => 
        c.status === 'COMPLETED' && new Date(c.updatedAt) >= monthAgo
      ).length,
      yearlyExports: data.contracts.filter(c => 
        c.status === 'COMPLETED' && new Date(c.updatedAt) >= yearAgo
      ).length,
      avgContractValue: calculateAvgContractValue(data.contracts),
      growthRate: calculateGrowthRate(data.contracts),
    },

    // Tab 7: Audit Trail
    auditTrail: {
      totalActivities: 0, // Will be loaded separately from audit endpoint
      todaysActions: 0,
      blockchainVerified: 0,
      organizationsInvolved: 0,
    },
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateAvgContractValue(contracts: ExportContract[]): number {
  const active = contracts.filter(c => 
    ['APPROVED', 'NBE_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status)
  );
  
  if (active.length === 0) return 0;
  
  const total = active.reduce((sum, c) => sum + c.totalValue, 0);
  return total / active.length;
}

function calculateGrowthRate(contracts: ExportContract[]): number {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  
  const thisMonthContracts = contracts.filter(c => 
    c.status === 'COMPLETED' && new Date(c.updatedAt) >= thisMonth
  ).length;
  
  const lastMonthContracts = contracts.filter(c => {
    const date = new Date(c.updatedAt);
    return c.status === 'COMPLETED' && date >= twoMonthsAgo && date < lastMonth;
  }).length;
  
  if (lastMonthContracts === 0) return thisMonthContracts > 0 ? 100 : 0;
  
  return ((thisMonthContracts - lastMonthContracts) / lastMonthContracts) * 100;
}
