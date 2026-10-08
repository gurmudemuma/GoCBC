/**
 * Banks Portal Data Loader
 * 
 * Handles parallel data loading and stats calculation for Banks Portal
 * Loads LCs, forex allocations, SWIFT messages, payments, settlements
 */

import { apiFetch } from '../../../../utils/api';

// ============================================================================
// Type Definitions
// ============================================================================

export interface LC {
  lcId: string;
  lcNumber: string;
  contractId: string;
  exporterId: string;
  issuingBank: string;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ISSUED' | 'FOREX_BACKED' | 'FOREX_ALLOCATED' | 'UTILIZED' | 'EXPIRED' | 'CLOSED';
  issueDate?: string;
  expiryDate?: string;
  utilizationDate?: string;
  documentsSubmitted?: boolean;
  documentsApproved?: boolean;
  paymentReleased?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForexAllocation {
  forexId: string;
  contractId: string;
  exporterId: string;
  lcId: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  status: 'REQUESTED' | 'CONFIRMED' | 'ALLOCATED' | 'EXPIRED' | 'REJECTED';
  requestDate: string;
  allocationDate?: string;
  expiryDate?: string;
}

export interface SwiftMessage {
  messageId: string;
  messageType: string;
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SENT' | 'RECEIVED' | 'FAILED';
  sentDate?: string;
  receivedDate?: string;
  lcId?: string;
  contractId?: string;
  reference: string;
}

export interface Payment {
  paymentId: string;
  lcId: string;
  contractId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'RELEASED' | 'COMPLETED' | 'FAILED';
  paymentDate?: string;
  releaseDate?: string;
  paymentMethod: string;
  reference: string;
}

export interface Settlement {
  settlementId: string;
  lcId: string;
  shipmentId: string;
  contractId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SETTLED' | 'FAILED';
  settlementDate?: string;
  deliveryConfirmed: boolean;
}

export interface LCDiscrepancy {
  discrepancyId: string;
  lcId: string;
  type: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  reportedDate: string;
  resolvedDate?: string;
  resolutionNotes?: string;
}

export interface BanksPortalData {
  lcs: LC[];
  forexAllocations: ForexAllocation[];
  swiftMessages: SwiftMessage[];
  payments: Payment[];
  settlements: Settlement[];
  discrepancies: LCDiscrepancy[];
  users: any[];
}

// ============================================================================
// Data Loading Functions
// ============================================================================

/**
 * Load all Banks Portal data in parallel
 */
export const loadBanksData = async (): Promise<BanksPortalData> => {
  console.log('[Banks DataLoader] 🔄 Loading Banks Portal data...');

  try {
    const [
      lcsResponse,
      forexResponse,
      swiftResponse,
      paymentsResponse,
      settlementsResponse,
      discrepanciesResponse,
      usersResponse,
    ] = await Promise.all([
      apiFetch('/lcs', { method: 'GET' }),
      apiFetch('/forex', { method: 'GET' }),
      apiFetch('/swift-messages', { method: 'GET' }),
      apiFetch('/payments', { method: 'GET' }),
      apiFetch('/settlements', { method: 'GET' }),
      apiFetch('/lc-discrepancies', { method: 'GET' }),
      apiFetch('/users?organization=BANKS', { method: 'GET' }),
    ]);

    // Parse responses
    const lcsData = lcsResponse.ok ? await lcsResponse.json() : { data: [] };
    const forexData = forexResponse.ok ? await forexResponse.json() : { data: [] };
    const swiftData = swiftResponse.ok ? await swiftResponse.json() : { data: [] };
    const paymentsData = paymentsResponse.ok ? await paymentsResponse.json() : { data: [] };
    const settlementsData = settlementsResponse.ok ? await settlementsResponse.json() : { data: [] };
    const discrepanciesData = discrepanciesResponse.ok ? await discrepanciesResponse.json() : { data: [] };
    const usersData = usersResponse.ok ? await usersResponse.json() : { data: [] };

    // Transform LCs
    const lcs: LC[] = (lcsData.data || []).map((lc: any) => ({
      lcId: lc.lcId || lc.id || '',
      lcNumber: lc.lcNumber || '',
      contractId: lc.contractId || '',
      exporterId: lc.exporterId || '',
      issuingBank: lc.issuingBank || '',
      amount: lc.amount || 0,
      currency: lc.currency || 'USD',
      status: lc.status || 'DRAFT',
      issueDate: lc.issueDate || undefined,
      expiryDate: lc.expiryDate || undefined,
      utilizationDate: lc.utilizationDate || undefined,
      documentsSubmitted: lc.documentsSubmitted || false,
      documentsApproved: lc.documentsApproved || false,
      paymentReleased: lc.paymentReleased || false,
      createdAt: lc.createdAt || new Date().toISOString(),
      updatedAt: lc.updatedAt || new Date().toISOString(),
    }));

    // Transform forex allocations
    const forexAllocations: ForexAllocation[] = (forexData.data || []).map((forex: any) => ({
      forexId: forex.forexId || forex.id || '',
      contractId: forex.contractId || '',
      exporterId: forex.exporterId || '',
      lcId: forex.lcId || '',
      requestedAmount: forex.requestedAmount || 0,
      allocatedAmount: forex.allocatedAmount || 0,
      currency: forex.currency || 'USD',
      exchangeRate: forex.exchangeRate || 0,
      status: forex.status || 'REQUESTED',
      requestDate: forex.requestDate || forex.createdAt || new Date().toISOString(),
      allocationDate: forex.allocationDate || undefined,
      expiryDate: forex.expiryDate || undefined,
    }));

    // Transform SWIFT messages
    const swiftMessages: SwiftMessage[] = (swiftData.data || []).map((msg: any) => ({
      messageId: msg.messageId || msg.id || '',
      messageType: msg.messageType || 'MT700',
      sender: msg.sender || '',
      receiver: msg.receiver || '',
      amount: msg.amount || 0,
      currency: msg.currency || 'USD',
      status: msg.status || 'PENDING',
      sentDate: msg.sentDate || undefined,
      receivedDate: msg.receivedDate || undefined,
      lcId: msg.lcId || undefined,
      contractId: msg.contractId || undefined,
      reference: msg.reference || '',
    }));

    // Transform payments
    const payments: Payment[] = (paymentsData.data || []).map((payment: any) => ({
      paymentId: payment.paymentId || payment.id || '',
      lcId: payment.lcId || '',
      contractId: payment.contractId || '',
      amount: payment.amount || 0,
      currency: payment.currency || 'USD',
      status: payment.status || 'PENDING',
      paymentDate: payment.paymentDate || undefined,
      releaseDate: payment.releaseDate || undefined,
      paymentMethod: payment.paymentMethod || 'LC',
      reference: payment.reference || '',
    }));

    // Transform settlements
    const settlements: Settlement[] = (settlementsData.data || []).map((settle: any) => ({
      settlementId: settle.settlementId || settle.id || '',
      lcId: settle.lcId || '',
      shipmentId: settle.shipmentId || '',
      contractId: settle.contractId || '',
      amount: settle.amount || 0,
      currency: settle.currency || 'USD',
      status: settle.status || 'PENDING',
      settlementDate: settle.settlementDate || undefined,
      deliveryConfirmed: settle.deliveryConfirmed || false,
    }));

    // Transform discrepancies
    const discrepancies: LCDiscrepancy[] = (discrepanciesData.data || []).map((disc: any) => ({
      discrepancyId: disc.discrepancyId || disc.id || '',
      lcId: disc.lcId || '',
      type: disc.type || '',
      description: disc.description || '',
      status: disc.status || 'OPEN',
      reportedDate: disc.reportedDate || disc.createdAt || new Date().toISOString(),
      resolvedDate: disc.resolvedDate || undefined,
      resolutionNotes: disc.resolutionNotes || undefined,
    }));

    console.log('[Banks DataLoader] ✅ Data loaded:', {
      lcs: lcs.length,
      forex: forexAllocations.length,
      swift: swiftMessages.length,
      payments: payments.length,
      settlements: settlements.length,
      discrepancies: discrepancies.length,
      users: usersData.data?.length || 0,
    });

    return {
      lcs,
      forexAllocations,
      swiftMessages,
      payments,
      settlements,
      discrepancies,
      users: usersData.data || [],
    };
  } catch (error) {
    console.error('[Banks DataLoader] ❌ Error loading data:', error);
    return {
      lcs: [],
      forexAllocations: [],
      swiftMessages: [],
      payments: [],
      settlements: [],
      discrepancies: [],
      users: [],
    };
  }
};

// ============================================================================
// Stats Calculation Functions
// ============================================================================

/**
 * Calculate stats for all Banks Portal tabs
 */
export const calculateBanksStats = (data: BanksPortalData) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    // Tab 0: Payment Methods
    paymentMethods: {
      activeLCs: data.lcs.filter(lc => 
        ['ISSUED', 'FOREX_BACKED', 'FOREX_ALLOCATED'].includes(lc.status)
      ).length,
      pendingPayments: data.payments.filter(p => p.status === 'PENDING').length,
      completedToday: data.payments.filter(p => 
        p.status === 'COMPLETED' && p.paymentDate && new Date(p.paymentDate) >= today
      ).length,
      total: data.lcs.length,
    },

    // Tab 1: Forex Allocations
    forexAllocations: {
      pending: data.forexAllocations.filter(f => f.status === 'REQUESTED').length,
      confirmed: data.forexAllocations.filter(f => f.status === 'CONFIRMED').length,
      allocated: data.forexAllocations.filter(f => f.status === 'ALLOCATED').length,
      total: data.forexAllocations.length,
    },

    // Tab 2: Document Examination
    documentExamination: {
      pending: data.lcs.filter(lc => 
        lc.documentsSubmitted && !lc.documentsApproved
      ).length,
      underReview: data.lcs.filter(lc => 
        lc.documentsSubmitted && !lc.documentsApproved && lc.status === 'ISSUED'
      ).length,
      approved: data.lcs.filter(lc => lc.documentsApproved).length,
      total: data.lcs.filter(lc => lc.documentsSubmitted).length,
    },

    // Tab 3: Payment Release
    paymentRelease: {
      readyForRelease: data.payments.filter(p => p.status === 'APPROVED').length,
      processing: data.payments.filter(p => p.status === 'PROCESSING').length,
      released: data.payments.filter(p => p.status === 'RELEASED' || p.status === 'COMPLETED').length,
      total: data.payments.length,
    },

    // Tab 4: SWIFT Messages
    swiftMessages: {
      pending: data.swiftMessages.filter(m => m.status === 'PENDING').length,
      sent: data.swiftMessages.filter(m => m.status === 'SENT').length,
      received: data.swiftMessages.filter(m => m.status === 'RECEIVED').length,
      total: data.swiftMessages.length,
    },

    // Tab 5: LC Settlements
    lcSettlements: {
      pending: data.settlements.filter(s => s.status === 'PENDING').length,
      inProgress: data.settlements.filter(s => s.status === 'IN_PROGRESS').length,
      settled: data.settlements.filter(s => s.status === 'SETTLED').length,
      total: data.settlements.length,
    },

    // Tab 6: Analytics
    analytics: {
      totalTransactions: data.lcs.length + data.payments.length,
      totalValue: data.lcs.reduce((sum, lc) => sum + lc.amount, 0),
      avgProcessingTime: calculateAvgProcessingTime(data.lcs),
      successRate: calculateSuccessRate(data.payments),
    },

    // Tab 7: User Management
    userManagement: {
      totalUsers: data.users.length,
      activeUsers: data.users.filter((u: any) => u.status === 'ACTIVE').length,
      admins: data.users.filter((u: any) => 
        u.role === 'ADMIN' || u.role === 'BANKS Portal Administrator'
      ).length,
      inactiveUsers: data.users.filter((u: any) => u.status === 'INACTIVE').length,
    },

    // Tab 8: Audit Trail
    auditTrail: {
      totalActivities: 0, // Will be loaded separately from audit endpoint
      todaysActions: 0,
      blockchainVerified: 0,
      organizationsInvolved: 0,
    },

    // Tab 9: LC Discrepancies
    lcDiscrepancies: {
      totalDiscrepancies: data.discrepancies.length,
      openCases: data.discrepancies.filter(d => 
        ['OPEN', 'UNDER_REVIEW'].includes(d.status)
      ).length,
      resolved: data.discrepancies.filter(d => 
        ['RESOLVED', 'CLOSED'].includes(d.status)
      ).length,
      avgResolutionTime: calculateAvgResolutionTime(data.discrepancies),
    },
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateAvgProcessingTime(lcs: LC[]): number {
  const completed = lcs.filter(
    lc => lc.status === 'UTILIZED' && lc.issueDate && lc.utilizationDate
  );
  
  if (completed.length === 0) return 0;
  
  const totalDays = completed.reduce((sum, lc) => {
    const issue = new Date(lc.issueDate!);
    const utilization = new Date(lc.utilizationDate!);
    const days = Math.floor((utilization.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  
  return Math.round(totalDays / completed.length);
}

function calculateSuccessRate(payments: Payment[]): number {
  if (payments.length === 0) return 100;
  
  const successful = payments.filter(p => 
    ['RELEASED', 'COMPLETED'].includes(p.status)
  ).length;
  
  return (successful / payments.length) * 100;
}

function calculateAvgResolutionTime(discrepancies: LCDiscrepancy[]): number {
  const resolved = discrepancies.filter(
    d => d.status === 'RESOLVED' && d.reportedDate && d.resolvedDate
  );
  
  if (resolved.length === 0) return 0;
  
  const totalDays = resolved.reduce((sum, d) => {
    const reported = new Date(d.reportedDate);
    const resolvedDate = new Date(d.resolvedDate!);
    const days = Math.floor((resolvedDate.getTime() - reported.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  
  return Math.round(totalDays / resolved.length);
}
