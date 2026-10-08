/**
 * Customs Portal Data Loader
 * 
 * Handles parallel data loading and stats calculation for Customs Portal
 * Loads customs declarations, inspections, clearances, border crossings
 */

import { apiFetch } from '../../../../utils/api';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CustomsDeclaration {
  declarationId: string;
  shipmentId: string;
  contractId: string;
  exporterId: string;
  declarationType: string;
  status: 'SUBMITTED' | 'INSPECTING' | 'UNDER_REVIEW' | 'CLEARED' | 'REJECTED' | 'BORDER_CROSSING' | 'CROSSED';
  declarationDate: string;
  submittedBy: string;
  clearanceNumber?: string;
  clearanceDate?: string;
  clearedBy?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  inspectionScheduled?: string;
  inspectionCompleted?: string;
  assignedInspector?: string;
  customsDuties?: number;
  vatAmount?: number;
  exitPoint?: string;
  validityPeriod?: number;
  borderCrossedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomsInspection {
  inspectionId: string;
  declarationId: string;
  shipmentId: string;
  inspectionType: 'STANDARD' | 'DETAILED' | 'RANDOM' | 'RISK_BASED';
  priorityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string;
  scheduledTime: string;
  completedDate?: string;
  assignedInspector: string;
  location: string;
  findings?: string;
  result?: 'PASSED' | 'FAILED' | 'CONDITIONAL';
  createdAt: string;
}

export interface CustomsClearance {
  clearanceId: string;
  declarationId: string;
  shipmentId: string;
  clearanceNumber: string;
  clearanceDate: string;
  clearanceType: 'FULL' | 'PARTIAL' | 'CONDITIONAL';
  clearedBy: string;
  customsDuties: number;
  vatAmount: number;
  totalAmount: number;
  exitPoint: string;
  validityPeriod: number;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  remarks?: string;
  createdAt: string;
}

export interface BorderCrossing {
  crossingId: string;
  declarationId: string;
  shipmentId: string;
  clearanceNumber: string;
  exitPoint: string;
  status: 'AT_BORDER' | 'CROSSED' | 'DELAYED' | 'REJECTED';
  arrivalDate?: string;
  crossedDate?: string;
  borderOfficer?: string;
  vehicleNumber?: string;
  sealNumber?: string;
  delayReason?: string;
  createdAt: string;
}

export interface CustomsPortalData {
  declarations: CustomsDeclaration[];
  inspections: CustomsInspection[];
  clearances: CustomsClearance[];
  borderCrossings: BorderCrossing[];
  users: any[];
}

// ============================================================================
// Data Loading Functions
// ============================================================================

/**
 * Load all Customs Portal data in parallel
 */
export const loadCustomsData = async (): Promise<CustomsPortalData> => {
  console.log('[Customs DataLoader] 🔄 Loading Customs Portal data...');

  try {
    const [
      declarationsResponse,
      inspectionsResponse,
      clearancesResponse,
      borderCrossingsResponse,
      usersResponse,
    ] = await Promise.all([
      apiFetch('/customs/declarations', { method: 'GET' }),
      apiFetch('/customs/inspections', { method: 'GET' }),
      apiFetch('/customs/clearances', { method: 'GET' }),
      apiFetch('/customs/border-crossings', { method: 'GET' }),
      apiFetch('/users?organization=CUSTOMS', { method: 'GET' }),
    ]);

    // Parse responses
    const declarationsData = declarationsResponse.ok ? await declarationsResponse.json() : { data: [] };
    const inspectionsData = inspectionsResponse.ok ? await inspectionsResponse.json() : { data: [] };
    const clearancesData = clearancesResponse.ok ? await clearancesResponse.json() : { data: [] };
    const borderCrossingsData = borderCrossingsResponse.ok ? await borderCrossingsResponse.json() : { data: [] };
    const usersData = usersResponse.ok ? await usersResponse.json() : { data: [] };

    // Transform declarations
    const declarations: CustomsDeclaration[] = (declarationsData.data || []).map((dec: any) => ({
      declarationId: dec.declarationId || dec.id || '',
      shipmentId: dec.shipmentId || '',
      contractId: dec.contractId || '',
      exporterId: dec.exporterId || '',
      declarationType: dec.declarationType || 'EXPORT',
      status: dec.status || 'SUBMITTED',
      declarationDate: dec.declarationDate || dec.createdAt || new Date().toISOString(),
      submittedBy: dec.submittedBy || '',
      clearanceNumber: dec.clearanceNumber || undefined,
      clearanceDate: dec.clearanceDate || undefined,
      clearedBy: dec.clearedBy || undefined,
      rejectionReason: dec.rejectionReason || undefined,
      rejectedBy: dec.rejectedBy || undefined,
      rejectedDate: dec.rejectedDate || undefined,
      inspectionScheduled: dec.inspectionScheduled || undefined,
      inspectionCompleted: dec.inspectionCompleted || undefined,
      assignedInspector: dec.assignedInspector || undefined,
      customsDuties: dec.customsDuties || 0,
      vatAmount: dec.vatAmount || 0,
      exitPoint: dec.exitPoint || undefined,
      validityPeriod: dec.validityPeriod || undefined,
      borderCrossedDate: dec.borderCrossedDate || undefined,
      createdAt: dec.createdAt || new Date().toISOString(),
      updatedAt: dec.updatedAt || new Date().toISOString(),
    }));

    // Transform inspections
    const inspections: CustomsInspection[] = (inspectionsData.data || []).map((insp: any) => ({
      inspectionId: insp.inspectionId || insp.id || '',
      declarationId: insp.declarationId || '',
      shipmentId: insp.shipmentId || '',
      inspectionType: insp.inspectionType || 'STANDARD',
      priorityLevel: insp.priorityLevel || 'NORMAL',
      status: insp.status || 'SCHEDULED',
      scheduledDate: insp.scheduledDate || new Date().toISOString(),
      scheduledTime: insp.scheduledTime || '09:00',
      completedDate: insp.completedDate || undefined,
      assignedInspector: insp.assignedInspector || '',
      location: insp.location || 'PORT',
      findings: insp.findings || undefined,
      result: insp.result || undefined,
      createdAt: insp.createdAt || new Date().toISOString(),
    }));

    // Transform clearances
    const clearances: CustomsClearance[] = (clearancesData.data || []).map((clear: any) => ({
      clearanceId: clear.clearanceId || clear.id || '',
      declarationId: clear.declarationId || '',
      shipmentId: clear.shipmentId || '',
      clearanceNumber: clear.clearanceNumber || '',
      clearanceDate: clear.clearanceDate || new Date().toISOString(),
      clearanceType: clear.clearanceType || 'FULL',
      clearedBy: clear.clearedBy || '',
      customsDuties: clear.customsDuties || 0,
      vatAmount: clear.vatAmount || 0,
      totalAmount: (clear.customsDuties || 0) + (clear.vatAmount || 0),
      exitPoint: clear.exitPoint || 'DJIBOUTI',
      validityPeriod: clear.validityPeriod || 30,
      expiryDate: clear.expiryDate || calculateExpiryDate(clear.clearanceDate, clear.validityPeriod),
      status: clear.status || 'ACTIVE',
      remarks: clear.remarks || undefined,
      createdAt: clear.createdAt || new Date().toISOString(),
    }));

    // Transform border crossings
    const borderCrossings: BorderCrossing[] = (borderCrossingsData.data || []).map((cross: any) => ({
      crossingId: cross.crossingId || cross.id || '',
      declarationId: cross.declarationId || '',
      shipmentId: cross.shipmentId || '',
      clearanceNumber: cross.clearanceNumber || '',
      exitPoint: cross.exitPoint || 'DJIBOUTI',
      status: cross.status || 'AT_BORDER',
      arrivalDate: cross.arrivalDate || undefined,
      crossedDate: cross.crossedDate || undefined,
      borderOfficer: cross.borderOfficer || undefined,
      vehicleNumber: cross.vehicleNumber || undefined,
      sealNumber: cross.sealNumber || undefined,
      delayReason: cross.delayReason || undefined,
      createdAt: cross.createdAt || new Date().toISOString(),
    }));

    console.log('[Customs DataLoader] ✅ Data loaded:', {
      declarations: declarations.length,
      inspections: inspections.length,
      clearances: clearances.length,
      borderCrossings: borderCrossings.length,
      users: usersData.data?.length || 0,
    });

    return {
      declarations,
      inspections,
      clearances,
      borderCrossings,
      users: usersData.data || [],
    };
  } catch (error) {
    console.error('[Customs DataLoader] ❌ Error loading data:', error);
    return {
      declarations: [],
      inspections: [],
      clearances: [],
      borderCrossings: [],
      users: [],
    };
  }
};

// ============================================================================
// Stats Calculation Functions
// ============================================================================

/**
 * Calculate stats for all Customs Portal tabs
 */
export const calculateCustomsStats = (data: CustomsPortalData) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return {
    // Tab 0: Submitted
    submitted: {
      pending: data.declarations.filter(d => d.status === 'SUBMITTED' && !d.inspectionScheduled).length,
      processing: data.declarations.filter(d => d.status === 'SUBMITTED' && d.inspectionScheduled).length,
      urgent: data.declarations.filter(d => {
        if (d.status !== 'SUBMITTED') return false;
        const daysSinceSubmission = Math.floor((Date.now() - new Date(d.declarationDate).getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceSubmission > 3;
      }).length,
      total: data.declarations.filter(d => d.status === 'SUBMITTED').length,
    },

    // Tab 1: Inspecting
    inspecting: {
      scheduled: data.inspections.filter(i => i.status === 'SCHEDULED').length,
      inProgress: data.inspections.filter(i => i.status === 'IN_PROGRESS').length,
      completed: data.inspections.filter(i => i.status === 'COMPLETED').length,
      total: data.inspections.filter(i => i.status !== 'CANCELLED').length,
    },

    // Tab 2: Under Review
    underReview: {
      documentReview: data.declarations.filter(d => 
        d.status === 'UNDER_REVIEW' && !d.inspectionCompleted
      ).length,
      complianceCheck: data.declarations.filter(d => 
        d.status === 'UNDER_REVIEW' && d.inspectionCompleted && !d.customsDuties
      ).length,
      dutyAssessment: data.declarations.filter(d => 
        d.status === 'UNDER_REVIEW' && d.customsDuties
      ).length,
      total: data.declarations.filter(d => d.status === 'UNDER_REVIEW').length,
    },

    // Tab 3: Cleared
    cleared: {
      todayCleared: data.declarations.filter(d => 
        d.status === 'CLEARED' && d.clearanceDate && new Date(d.clearanceDate) >= today
      ).length,
      weekCleared: data.declarations.filter(d => 
        d.status === 'CLEARED' && d.clearanceDate && new Date(d.clearanceDate) >= weekAgo
      ).length,
      avgClearanceTime: calculateAvgClearanceTime(data.declarations),
      total: data.declarations.filter(d => d.status === 'CLEARED').length,
    },

    // Tab 4: Rejected
    rejected: {
      documentation: data.declarations.filter(d => 
        d.status === 'REJECTED' && d.rejectionReason?.includes('DOCUMENTATION')
      ).length,
      compliance: data.declarations.filter(d => 
        d.status === 'REJECTED' && d.rejectionReason?.includes('COMPLIANCE')
      ).length,
      prohibited: data.declarations.filter(d => 
        d.status === 'REJECTED' && d.rejectionReason?.includes('PROHIBITED')
      ).length,
      total: data.declarations.filter(d => d.status === 'REJECTED').length,
    },

    // Tab 5: Border Crossing
    borderCrossing: {
      atBorder: data.borderCrossings.filter(b => b.status === 'AT_BORDER').length,
      crossed: data.borderCrossings.filter(b => 
        b.status === 'CROSSED' && b.crossedDate && new Date(b.crossedDate) >= today
      ).length,
      delayed: data.borderCrossings.filter(b => b.status === 'DELAYED').length,
      total: data.borderCrossings.length,
    },

    // Tab 6: User Management
    userManagement: {
      totalUsers: data.users.length,
      activeUsers: data.users.filter((u: any) => u.status === 'ACTIVE').length,
      admins: data.users.filter((u: any) => 
        u.role === 'ADMIN' || u.role === 'CUSTOMS Portal Administrator'
      ).length,
      inactiveUsers: data.users.filter((u: any) => u.status === 'INACTIVE').length,
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

function calculateExpiryDate(clearanceDate: string | undefined, validityPeriod: number = 30): string {
  const date = clearanceDate ? new Date(clearanceDate) : new Date();
  date.setDate(date.getDate() + validityPeriod);
  return date.toISOString();
}

function calculateAvgClearanceTime(declarations: CustomsDeclaration[]): number {
  const cleared = declarations.filter(
    d => d.status === 'CLEARED' && d.declarationDate && d.clearanceDate
  );
  
  if (cleared.length === 0) return 0;
  
  const totalDays = cleared.reduce((sum, d) => {
    const declaration = new Date(d.declarationDate);
    const clearance = new Date(d.clearanceDate!);
    const days = Math.floor((clearance.getTime() - declaration.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  
  return Math.round(totalDays / cleared.length);
}
