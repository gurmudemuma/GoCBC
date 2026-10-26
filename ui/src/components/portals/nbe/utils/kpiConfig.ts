import {
  CurrencyExchange,
  HourglassEmpty,
  CheckCircle,
  Assignment,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  SwapHoriz,
  FlightTakeoff,
  LocalShipping,
  Schedule,
  Warning,
  Gavel,
  VerifiedUser,
  Error,
  PendingActions,
  Assessment,
  ShowChart,
  AccountBalance,
  Timeline,
  Person,
  Group,
  AdminPanelSettings,
  Block,
} from '@mui/icons-material';

/**
 * NBE Portal KPI Configuration
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

// Brand colors
export const NBE_BRAND_COLOR = '#1565c0'; // Dark blue
export const NBE_SECONDARY_COLOR = '#42a5f5'; // Light blue
const SUCCESS_COLOR = '#2e7d32';
const WARNING_COLOR = '#ed6c02';
const ERROR_COLOR = '#d32f2f';
const INFO_COLOR = '#0288d1';

/**
 * Tab 0: Forex Monitoring KPIs
 */
export const getForexMonitoringKPIs = (data: {
  pending: number;
  confirmed: number;
  allocated: number;
  total: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'Pending Requests',
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
    color: NBE_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 1: Exchange Rates KPIs
 */
export const getExchangeRatesKPIs = (data: {
  currentRate: number;
  dailyChange: number;
  weeklyAvg: number;
  totalRates: number;
}): KPICard[] => [
  {
    icon: AttachMoney,
    label: 'Current USD Rate',
    value: data.currentRate,
    color: NBE_BRAND_COLOR,
    format: 'currency',
  },
  {
    icon: data.dailyChange >= 0 ? TrendingUp : TrendingDown,
    label: 'Daily Change',
    value: `${data.dailyChange >= 0 ? '+' : ''}${data.dailyChange.toFixed(2)}%`,
    color: data.dailyChange >= 0 ? SUCCESS_COLOR : ERROR_COLOR,
  },
  {
    icon: SwapHoriz,
    label: 'Weekly Average',
    value: data.weeklyAvg,
    color: INFO_COLOR,
    format: 'currency',
  },
  {
    icon: Timeline,
    label: 'Rate Updates',
    value: data.totalRates,
    color: NBE_SECONDARY_COLOR,
    format: 'number',
  },
];

/**
 * Tab 2: SWIFT Monitoring KPIs
 */
export const getSwiftMonitoringKPIs = (data: {
  pending: number;
  inTransit: number;
  completed: number;
  total: number;
}): KPICard[] => [
  {
    icon: Schedule,
    label: 'Pending Messages',
    value: data.pending,
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
    label: 'Completed',
    value: data.completed,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: FlightTakeoff,
    label: 'Total Messages',
    value: data.total,
    color: NBE_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 3: Policy & Compliance KPIs
 */
export const getPolicyComplianceKPIs = (data: {
  compliant: number;
  underReview: number;
  violations: number;
  complianceRate: number;
}): KPICard[] => [
  {
    icon: VerifiedUser,
    label: 'Compliant',
    value: data.compliant,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: PendingActions,
    label: 'Under Review',
    value: data.underReview,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: Warning,
    label: 'Violations',
    value: data.violations,
    color: ERROR_COLOR,
    format: 'number',
  },
  {
    icon: Gavel,
    label: 'Compliance Rate',
    value: `${data.complianceRate.toFixed(1)}%`,
    color: NBE_BRAND_COLOR,
  },
];

/**
 * Tab 4: Analytics KPIs
 */
export const getAnalyticsKPIs = (data: {
  totalExports: number;
  forexVolume: number;
  avgProcessingTime: number;
  activeContracts: number;
}): KPICard[] => [
  {
    icon: Assessment,
    label: 'Total Exports',
    value: data.totalExports,
    color: NBE_BRAND_COLOR,
    format: 'number',
  },
  {
    icon: AccountBalance,
    label: 'Forex Volume (M)',
    value: `$${(data.forexVolume / 1000000).toFixed(2)}M`,
    color: SUCCESS_COLOR,
  },
  {
    icon: Schedule,
    label: 'Avg Processing',
    value: `${data.avgProcessingTime} days`,
    color: INFO_COLOR,
  },
  {
    icon: ShowChart,
    label: 'Active Contracts',
    value: data.activeContracts,
    color: NBE_SECONDARY_COLOR,
    format: 'number',
  },
];

/**
 * Tab 5: User Management KPIs
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
    color: NBE_BRAND_COLOR,
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
 * Tab 6: Audit Trail KPIs
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
    color: NBE_BRAND_COLOR,
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
    icon: AccountBalance,
    label: 'Organizations',
    value: data.organizationsInvolved,
    color: NBE_SECONDARY_COLOR,
    format: 'number',
  },
];

/**
 * Tab 7: Forex Repatriation KPIs
 */
export const getForexRepatriationKPIs = (data: {
  pending: number;
  inProgress: number;
  completed: number;
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
    icon: LocalShipping,
    label: 'In Progress',
    value: data.inProgress,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Completed',
    value: data.completed,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Assignment,
    label: 'Total Shipments',
    value: data.total,
    color: NBE_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Get KPIs based on active tab
 */
export const getKPIsForTab = (tabIndex: number, data: any): KPICard[] => {
  switch (tabIndex) {
    case 0:
      return getForexMonitoringKPIs(data);
    case 1:
      return getExchangeRatesKPIs(data);
    case 2:
      return getSwiftMonitoringKPIs(data);
    case 3:
      return getPolicyComplianceKPIs(data);
    case 4:
      return getAnalyticsKPIs(data);
    case 5:
      return getUserManagementKPIs(data);
    case 6:
      return getAuditTrailKPIs(data);
    case 7:
      return getForexRepatriationKPIs(data);
    default:
      return [];
  }
};
