import {
  Assessment,
  Description,
  AccountBalance,
  LocalShipping,
  Assignment,
  AttachMoney,
  TrendingUp,
  CheckCircle,
  HourglassEmpty,
  Warning,
  Cancel,
  Schedule,
  Inventory,
  PendingActions,
  Paid,
  Timeline,
  VerifiedUser,
  ShowChart,
} from '@mui/icons-material';

/**
 * Exporter Portal KPI Configuration
 * 
 * Context-aware KPIs that change based on active tab
 * Each tab shows 4 relevant KPI cards
 */

export interface KPICard {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  format?: 'number' | 'currency' | 'percentage' | 'days';
}

// Brand colors (matching Exporter/Banks golden theme)
export const EXPORTER_BRAND_COLOR = '#9b30b7'; // Purple
export const EXPORTER_SECONDARY_COLOR = '#FFD700'; // Golden
const SUCCESS_COLOR = '#2e7d32';
const WARNING_COLOR = '#ed6c02';
const ERROR_COLOR = '#d32f2f';
const INFO_COLOR = '#0288d1';

/**
 * Tab 0: Dashboard KPIs
 */
export const getDashboardKPIs = (data: {
  activeContracts: number;
  totalValue: number;
  shipmentsInTransit: number;
  pendingPayments: number;
}): KPICard[] => [
  {
    icon: Description,
    label: 'Active Contracts',
    value: data.activeContracts,
    color: EXPORTER_BRAND_COLOR,
    format: 'number',
  },
  {
    icon: AttachMoney,
    label: 'Total Value',
    value: `$${(data.totalValue / 1000000).toFixed(2)}M`,
    color: EXPORTER_SECONDARY_COLOR,
  },
  {
    icon: LocalShipping,
    label: 'In Transit',
    value: data.shipmentsInTransit,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: HourglassEmpty,
    label: 'Pending Payments',
    value: data.pendingPayments,
    color: WARNING_COLOR,
    format: 'number',
  },
];

/**
 * Tab 1: My Contracts KPIs
 */
export const getMyContractsKPIs = (data: {
  draft: number;
  pending: number;
  approved: number;
  active: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'Draft',
    value: data.draft,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: PendingActions,
    label: 'Pending Approval',
    value: data.pending,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Approved',
    value: data.approved,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Description,
    label: 'Active',
    value: data.active,
    color: EXPORTER_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 2: Forex & Banking KPIs
 */
export const getForexBankingKPIs = (data: {
  pendingForex: number;
  allocatedForex: number;
  issuedLCs: number;
  totalForexValue: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'Pending Forex',
    value: data.pendingForex,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Allocated',
    value: data.allocatedForex,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: AccountBalance,
    label: 'Issued LCs',
    value: data.issuedLCs,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: AttachMoney,
    label: 'Total Forex',
    value: `$${(data.totalForexValue / 1000000).toFixed(2)}M`,
    color: EXPORTER_BRAND_COLOR,
  },
];

/**
 * Tab 3: Shipments KPIs
 */
export const getShipmentsKPIs = (data: {
  preparing: number;
  inTransit: number;
  delivered: number;
  total: number;
}): KPICard[] => [
  {
    icon: Inventory,
    label: 'Preparing',
    value: data.preparing,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: LocalShipping,
    label: 'In Transit',
    value: data.inTransit,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Delivered',
    value: data.delivered,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Assignment,
    label: 'Total Shipments',
    value: data.total,
    color: EXPORTER_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 4: Customs KPIs
 */
export const getCustomsKPIs = (data: {
  pending: number;
  cleared: number;
  rejected: number;
  total: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'Pending Clearance',
    value: data.pending,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Cleared',
    value: data.cleared,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Cancel,
    label: 'Rejected',
    value: data.rejected,
    color: ERROR_COLOR,
    format: 'number',
  },
  {
    icon: Assignment,
    label: 'Total Declarations',
    value: data.total,
    color: EXPORTER_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 5: LC & Payments KPIs
 */
export const getLCPaymentsKPIs = (data: {
  pendingLCs: number;
  activeLCs: number;
  receivedPayments: number;
  totalPaymentValue: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'Pending LCs',
    value: data.pendingLCs,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: AccountBalance,
    label: 'Active LCs',
    value: data.activeLCs,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: Paid,
    label: 'Received Payments',
    value: data.receivedPayments,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: AttachMoney,
    label: 'Total Received',
    value: `$${(data.totalPaymentValue / 1000000).toFixed(2)}M`,
    color: EXPORTER_BRAND_COLOR,
  },
];

/**
 * Tab 6: Reports KPIs
 */
export const getReportsKPIs = (data: {
  monthlyExports: number;
  yearlyExports: number;
  avgContractValue: number;
  growthRate: number;
}): KPICard[] => [
  {
    icon: ShowChart,
    label: 'Monthly Exports',
    value: data.monthlyExports,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: TrendingUp,
    label: 'Yearly Exports',
    value: data.yearlyExports,
    color: EXPORTER_BRAND_COLOR,
    format: 'number',
  },
  {
    icon: AttachMoney,
    label: 'Avg Contract Value',
    value: `$${(data.avgContractValue / 1000).toFixed(0)}K`,
    color: EXPORTER_SECONDARY_COLOR,
  },
  {
    icon: Assessment,
    label: 'Growth Rate',
    value: `${data.growthRate >= 0 ? '+' : ''}${data.growthRate.toFixed(1)}%`,
    color: data.growthRate >= 0 ? SUCCESS_COLOR : ERROR_COLOR,
  },
];

/**
 * Tab 7: Audit Trail KPIs
 */
export const getAuditTrailKPIs = (data: {
  totalActivities: number;
  todaysActions: number;
  blockchainVerified: number;
  organizationsInvolved: number;
}): KPICard[] => [
  {
    icon: Assignment,
    label: 'Total Activities',
    value: data.totalActivities,
    color: EXPORTER_BRAND_COLOR,
    format: 'number',
  },
  {
    icon: Schedule,
    label: "Today's Actions",
    value: data.todaysActions,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: VerifiedUser,
    label: 'Blockchain Verified',
    value: data.blockchainVerified,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Timeline,
    label: 'Organizations',
    value: data.organizationsInvolved,
    color: EXPORTER_SECONDARY_COLOR,
    format: 'number',
  },
];

/**
 * Get KPIs based on active tab
 */
export const getKPIsForTab = (tabIndex: number, data: any): KPICard[] => {
  switch (tabIndex) {
    case 0:
      return getDashboardKPIs(data);
    case 1:
      return getMyContractsKPIs(data);
    case 2:
      return getForexBankingKPIs(data);
    case 3:
      return getShipmentsKPIs(data);
    case 4:
      return getCustomsKPIs(data);
    case 5:
      return getLCPaymentsKPIs(data);
    case 6:
      return getReportsKPIs(data);
    case 7:
      return getAuditTrailKPIs(data);
    default:
      return [];
  }
};
