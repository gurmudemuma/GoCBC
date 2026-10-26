// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECTA Portal - Data Loader
// Handles data loading and transformation for ECTA Portal

import { apiFetch } from '@/config/api.config';
import { loadPortalData, calculateKPIStats } from '@/utils/portalDataLoader';

export interface ExporterApplication {
  id?: number;
  application_id: string;
  company_name: string;
  tin_number: string;
  business_license_number: string;
  registration_date?: string;
  exporter_type?: string;
  capital_requirement: string;
  professional_taster: string;
  taster_certificate: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  reviewed_date?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  ecta_license_number?: string;
  license_expiry_date?: string;
}

export interface Contract {
  contract_id: string;
  exporter_id: string;
  buyer_name: string;
  buyer_country: string;
  coffee_type: string;
  quantity: number;
  total_value: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NBE_REGISTERED';
  registration_date?: string;
  approval_date?: string;
  nbe_reference_number?: string;
}

export interface QualityInspection {
  inspection_id: string;
  shipment_id: string;
  inspector_name: string;
  inspection_date: string;
  grade: string;
  moisture_content: number;
  defect_count: number;
  cup_quality: string;
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'SCHEDULED';
  notes?: string;
}

export interface ECTAStats {
  pendingApplications: number;
  approvedExporters: number;
  rejectedApplications: number;
  totalApplications: number;
  pendingContracts: number;
  approvedContracts: number;
  rejectedContracts: number;
  totalContracts: number;
  pendingInspections: number;
  completedInspections: number;
  passedInspections: number;
  failedInspections: number;
  activeLicenses: number;
  expiringLicenses: number;
  expiredLicenses: number;
  renewalsPending: number;
}

/**
 * Load all ECTA portal data
 */
export const loadECTAData = async (token: string) => {
  const result = await loadPortalData({
    token,
    endpoints: [
      {
        name: 'applications',
        endpoint: '/ecta/applications',
        transform: (data: any[]) => data.map(app => ({
          id: app.id,
          application_id: app.application_id || app.applicationId,
          company_name: app.company_name || app.companyName,
          tin_number: app.tin_number || app.tinNumber,
          business_license_number: app.business_license_number || app.businessLicenseNumber,
          registration_date: app.registration_date || app.registrationDate,
          exporter_type: app.exporter_type || app.exporterType,
          capital_requirement: app.capital_requirement || app.capitalRequirement,
          professional_taster: app.professional_taster || app.professionalTaster,
          taster_certificate: app.taster_certificate || app.tasterCertificate,
          contact_person: app.contact_person || app.contactPerson,
          email: app.email,
          phone: app.phone,
          address: app.address,
          status: app.status || 'PENDING',
          reviewed_date: app.reviewed_date || app.reviewedDate,
          reviewed_by: app.reviewed_by || app.reviewedBy,
          rejection_reason: app.rejection_reason || app.rejectionReason,
          ecta_license_number: app.ecta_license_number || app.ectaLicenseNumber,
          license_expiry_date: app.license_expiry_date || app.licenseExpiryDate,
        })),
        fallback: [],
      },
      {
        name: 'contracts',
        endpoint: '/contracts',
        transform: (data: any[]) => data.map(contract => ({
          contract_id: contract.contract_id || contract.contractId,
          exporter_id: contract.exporter_id || contract.exporterId,
          buyer_name: contract.buyer_name || contract.buyerName,
          buyer_country: contract.buyer_country || contract.buyerCountry,
          coffee_type: contract.coffee_type || contract.coffeeType,
          quantity: parseFloat(contract.quantity || 0),
          total_value: parseFloat(contract.total_value || contract.totalValue || 0),
          currency: contract.currency || 'USD',
          status: contract.status || 'PENDING',
          registration_date: contract.registration_date || contract.registrationDate,
          approval_date: contract.approval_date || contract.approvalDate,
          nbe_reference_number: contract.nbe_reference_number || contract.nbeReferenceNumber,
        })),
        fallback: [],
      },
      {
        name: 'inspections',
        endpoint: '/quality/inspections',
        transform: (data: any[]) => data.map(inspection => ({
          inspection_id: inspection.inspection_id || inspection.inspectionId,
          shipment_id: inspection.shipment_id || inspection.shipmentId,
          inspector_name: inspection.inspector_name || inspection.inspectorName,
          inspection_date: inspection.inspection_date || inspection.inspectionDate,
          grade: inspection.grade,
          moisture_content: parseFloat(inspection.moisture_content || inspection.moistureContent || 0),
          defect_count: parseInt(inspection.defect_count || inspection.defectCount || 0),
          cup_quality: inspection.cup_quality || inspection.cupQuality,
          status: inspection.status || 'PENDING',
          notes: inspection.notes,
        })),
        fallback: [],
      },
    ],
    onError: (name, error) => {
      console.warn(`[ECTA] ${name} failed:`, error);
    },
  });

  return {
    applications: result.data.applications || [],
    contracts: result.data.contracts || [],
    inspections: result.data.inspections || [],
    success: result.success,
    errors: result.errors,
  };
};

/**
 * Calculate ECTA KPI statistics
 */
export const calculateECTAStats = (
  applications: ExporterApplication[],
  contracts: Contract[],
  inspections: QualityInspection[]
): ECTAStats => {
  // Application stats
  const appStats = calculateKPIStats(applications, {
    total: true,
    countByStatus: ['PENDING', 'APPROVED', 'REJECTED'],
  });

  // Contract stats
  const contractStats = calculateKPIStats(contracts, {
    total: true,
    countByStatus: ['PENDING', 'APPROVED', 'REJECTED'],
  });

  // Inspection stats
  const inspectionStats = calculateKPIStats(inspections, {
    total: true,
    countByStatus: ['PENDING', 'PASSED', 'FAILED'],
  });

  // Calculate license stats
  const approvedExporters = applications.filter(app => app.status === 'APPROVED');
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const activeLicenses = approvedExporters.filter(exp => {
    if (!exp.license_expiry_date) return true;
    const expiryDate = new Date(exp.license_expiry_date);
    return expiryDate > now;
  }).length;

  const expiringLicenses = approvedExporters.filter(exp => {
    if (!exp.license_expiry_date) return false;
    const expiryDate = new Date(exp.license_expiry_date);
    return expiryDate > now && expiryDate < thirtyDaysFromNow;
  }).length;

  const expiredLicenses = approvedExporters.filter(exp => {
    if (!exp.license_expiry_date) return false;
    const expiryDate = new Date(exp.license_expiry_date);
    return expiryDate <= now;
  }).length;

  return {
    pendingApplications: appStats.pending || 0,
    approvedExporters: appStats.approved || 0,
    rejectedApplications: appStats.rejected || 0,
    totalApplications: appStats.total || 0,
    pendingContracts: contractStats.pending || 0,
    approvedContracts: contractStats.approved || 0,
    rejectedContracts: contractStats.rejected || 0,
    totalContracts: contractStats.total || 0,
    pendingInspections: inspectionStats.pending || 0,
    completedInspections: (inspectionStats.passed || 0) + (inspectionStats.failed || 0),
    passedInspections: inspectionStats.passed || 0,
    failedInspections: inspectionStats.failed || 0,
    activeLicenses,
    expiringLicenses,
    expiredLicenses,
    renewalsPending: expiringLicenses + expiredLicenses,
  };
};

/**
 * Get status color for applications
 */
export const getApplicationStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    PENDING: 'warning',
    UNDER_REVIEW: 'info',
    APPROVED: 'success',
    REJECTED: 'error',
  };
  return statusColors[status] || 'default';
};

/**
 * Get status color for contracts
 */
export const getContractStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'error',
    NBE_REGISTERED: 'primary',
  };
  return statusColors[status] || 'default';
};

/**
 * Get status color for inspections
 */
export const getInspectionStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    PENDING: 'warning',
    SCHEDULED: 'info',
    PASSED: 'success',
    FAILED: 'error',
  };
  return statusColors[status] || 'default';
};

export default {
  loadECTAData,
  calculateECTAStats,
  getApplicationStatusColor,
  getContractStatusColor,
  getInspectionStatusColor,
};
