import {
  Payment,
  CurrencyExchange,
  Description,
  AttachMoney,
  AccountBalance,
  CheckCircle,
  Assessment,
  Person,
  Group,
  AdminPanelSettings,
  Block,
  Error,
  HourglassEmpty,
  Schedule,
  Assignment,
  Warning,
  TrendingUp,
  Paid,
  VerifiedUser,
  Timeline,
} from '@mui/icons-material';

/**
 * Banks Portal KPI Configuration
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

// Brand colors (CBE purple and golden)
export const BANKS_BRAND_COLOR = '#9b30b7'; // Purple
export const BANKS_SECONDARY_COLOR = '#FFD700'; // Golden
const SUCCESS_COLOR = '#2e7d32';
const WARNING_COLOR = '#ed6c02';
const ERROR_COLOR = '#d32f2f';
const INFO_COLOR = '#0288d1';

/**
 * Tab 0: Payment Methods KPIs
 */
export const getPaymentMethodsKPIs = (data: {
  activeLCs: number;
  pendingPayments: number;
  completedToday: number;
  total: number;
}): KPICard[] => [
  {
    icon: AccountBalance,
    label: 'Active LCs',
    value: data.activeLCs,
    color: BANKS_BRAND_COLOR,
    format: 'number',
  },
  {
    icon: HourglassEmpty,
    label: 'Pending Payments',
    value: data.pendingPayments,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Completed Today',
    value: data.completedToday,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Payment,
    label: 'Total Methods',
    value: data.total,
    color: INFO_COLOR,
    format: 'number',
  },
];

/**
 * Tab 1: Forex Allocations KPIs
 */
export const getForexAllocationsKPIs = (data: {
  pending: number;
  confirmed: number;
  allocated: number;
  total: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'Pending',
    value: data.pending,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Confirmed',
    value: data.confirmed,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CurrencyExchange,
    label: 'Allocated',
    value: data.allocated,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Assignment,
    label: 'Total Requests',
    value: data.total,
    color: BANKS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 2: Document Examination KPIs
 */
export const getDocumentExaminationKPIs = (data: {
  pending: number;
  underReview: number;
  approved: number;
  total: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'Pending',
    value: data.pending,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: Schedule,
    label: 'Under Review',
    value: data.underReview,
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
    label: 'Total Documents',
    value: data.total,
    color: BANKS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 3: Payment Release KPIs
 */
export const getPaymentReleaseKPIs = (data: {
  readyForRelease: number;
  processing: number;
  released: number;
  total: number;
}): KPICard[] => [
  {
    icon: CheckCircle,
    label: 'Ready for Release',
    value: data.readyForRelease,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Schedule,
    label: 'Processing',
    value: data.processing,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: Paid,
    label: 'Released',
    value: data.released,
    color: BANKS_SECONDARY_COLOR,
    format: 'number',
  },
  {
    icon: AttachMoney,
    label: 'Total Payments',
    value: data.total,
    color: BANKS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 4: SWIFT Messages KPIs
 */
export const getSwiftMessagesKPIs = (data: {
  pending: number;
  sent: number;
  received: number;
  total: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'Pending',
    value: data.pending,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: TrendingUp,
    label: 'Sent',
    value: data.sent,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Received',
    value: data.received,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: AccountBalance,
    label: 'Total Messages',
    value: data.total,
    color: BANKS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 5: LC Settlements KPIs
 */
export const getLCSettlementsKPIs = (data: {
  pending: number;
  inProgress: number;
  settled: number;
  total: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'Pending',
    value: data.pending,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: Schedule,
    label: 'In Progress',
    value: data.inProgress,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Settled',
    value: data.settled,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: AccountBalance,
    label: 'Total Settlements',
    value: data.total,
    color: BANKS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 6: Analytics KPIs
 */
export const getAnalyticsKPIs = (data: {
  totalTransactions: number;
  totalValue: number;
  avgProcessingTime: number;
  successRate: number;
}): KPICard[] => [
  {
    icon: Assessment,
    label: 'Total Transactions',
    value: data.totalTransactions,
    color: BANKS_BRAND_COLOR,
    format: 'number',
  },
  {
    icon: AttachMoney,
    label: 'Total Value',
    value: `$${(data.totalValue / 1000000).toFixed(2)}M`,
    color: BANKS_SECONDARY_COLOR,
  },
  {
    icon: Schedule,
    label: 'Avg Processing',
    value: `${data.avgProcessingTime} days`,
    color: INFO_COLOR,
  },
  {
    icon: TrendingUp,
    label: 'Success Rate',
    value: `${data.successRate.toFixed(1)}%`,
    color: SUCCESS_COLOR,
  },
];

/**
 * Tab 7: User Management KPIs
 */
export const getUserManagementKPIs = (data: {
  totalUsers: number;
  activeUsers: number;
  admins: number;
  inactiveUsers: number;
}): KPICard[] => [
  {
    icon: Group,
    label: 'Total Users',
    value: data.totalUsers,
    color: BANKS_BRAND_COLOR,
    format: 'number',
  },
  {
    icon: Person,
    label: 'Active Users',
    value: data.activeUsers,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: AdminPanelSettings,
    label: 'Administrators',
    value: data.admins,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: Block,
    label: 'Inactive Users',
    value: data.inactiveUsers,
    color: WARNING_COLOR,
    format: 'number',
  },
];

/**
 * Tab 8: Audit Trail KPIs
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
    color: BANKS_BRAND_COLOR,
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
    color: BANKS_SECONDARY_COLOR,
    format: 'number',
  },
];

/**
 * Tab 9: LC Discrepancies KPIs
 */
export const getLCDiscrepanciesKPIs = (data: {
  totalDiscrepancies: number;
  openCases: number;
  resolved: number;
  avgResolutionTime: number;
}): KPICard[] => [
  {
    icon: Error,
    label: 'Total Discrepancies',
    value: data.totalDiscrepancies,
    color: ERROR_COLOR,
    format: 'number',
  },
  {
    icon: Warning,
    label: 'Open Cases',
    value: data.openCases,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Resolved',
    value: data.resolved,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Schedule,
    label: 'Avg Resolution',
    value: `${data.avgResolutionTime} days`,
    color: INFO_COLOR,
  },
];

/**
 * Get KPIs based on active tab
 */
export const getKPIsForTab = (tabIndex: number, data: any): KPICard[] => {
  switch (tabIndex) {
    case 0:
      return getPaymentMethodsKPIs(data);
    case 1:
      return getForexAllocationsKPIs(data);
    case 2:
      return getDocumentExaminationKPIs(data);
    case 3:
      return getPaymentReleaseKPIs(data);
    case 4:
      return getSwiftMessagesKPIs(data);
    case 5:
      return getLCSettlementsKPIs(data);
    case 6:
      return getAnalyticsKPIs(data);
    case 7:
      return getUserManagementKPIs(data);
    case 8:
      return getAuditTrailKPIs(data);
    case 9:
      return getLCDiscrepanciesKPIs(data);
    default:
      return [];
  }
};
