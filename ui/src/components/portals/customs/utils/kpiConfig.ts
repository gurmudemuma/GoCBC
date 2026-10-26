import {
  LocalShipping,
  Security,
  Warning,
  CheckCircle,
  Cancel,
  DirectionsBoat,
  HourglassEmpty,
  Schedule,
  Assignment,
  Gavel,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Person,
  Group,
  AdminPanelSettings,
  Block,
  VerifiedUser,
  AccountBalance,
  Timeline,
  Error,
} from '@mui/icons-material';

/**
 * Customs Portal KPI Configuration
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
export const CUSTOMS_BRAND_COLOR = '#d32f2f'; // Red
export const CUSTOMS_SECONDARY_COLOR = '#f44336'; // Light red
const SUCCESS_COLOR = '#2e7d32';
const WARNING_COLOR = '#ed6c02';
const ERROR_COLOR = '#d32f2f';
const INFO_COLOR = '#0288d1';

/**
 * Tab 0: Submitted KPIs
 */
export const getSubmittedKPIs = (data: {
  pending: number;
  processing: number;
  urgent: number;
  total: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'Pending Review',
    value: data.pending,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: LocalShipping,
    label: 'Processing',
    value: data.processing,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: Warning,
    label: 'Urgent',
    value: data.urgent,
    color: ERROR_COLOR,
    format: 'number',
  },
  {
    icon: Assignment,
    label: 'Total Submissions',
    value: data.total,
    color: CUSTOMS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 1: Inspecting KPIs
 */
export const getInspectingKPIs = (data: {
  scheduled: number;
  inProgress: number;
  completed: number;
  total: number;
}): KPICard[] => [
  {
    icon: Schedule,
    label: 'Scheduled',
    value: data.scheduled,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: Security,
    label: 'In Progress',
    value: data.inProgress,
    color: WARNING_COLOR,
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
    label: 'Total Inspections',
    value: data.total,
    color: CUSTOMS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 2: Under Review KPIs
 */
export const getUnderReviewKPIs = (data: {
  documentReview: number;
  complianceCheck: number;
  dutyAssessment: number;
  total: number;
}): KPICard[] => [
  {
    icon: Assignment,
    label: 'Document Review',
    value: data.documentReview,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: Gavel,
    label: 'Compliance Check',
    value: data.complianceCheck,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: AttachMoney,
    label: 'Duty Assessment',
    value: data.dutyAssessment,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Warning,
    label: 'Total Under Review',
    value: data.total,
    color: CUSTOMS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 3: Cleared KPIs
 */
export const getClearedKPIs = (data: {
  todayCleared: number;
  weekCleared: number;
  avgClearanceTime: number;
  total: number;
}): KPICard[] => [
  {
    icon: CheckCircle,
    label: 'Cleared Today',
    value: data.todayCleared,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: TrendingUp,
    label: 'This Week',
    value: data.weekCleared,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: Schedule,
    label: 'Avg Time (days)',
    value: data.avgClearanceTime,
    color: WARNING_COLOR,
    format: 'days',
  },
  {
    icon: Assignment,
    label: 'Total Cleared',
    value: data.total,
    color: CUSTOMS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 4: Rejected KPIs
 */
export const getRejectedKPIs = (data: {
  documentation: number;
  compliance: number;
  prohibited: number;
  total: number;
}): KPICard[] => [
  {
    icon: Assignment,
    label: 'Documentation',
    value: data.documentation,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: Gavel,
    label: 'Compliance',
    value: data.compliance,
    color: ERROR_COLOR,
    format: 'number',
  },
  {
    icon: Error,
    label: 'Prohibited',
    value: data.prohibited,
    color: ERROR_COLOR,
    format: 'number',
  },
  {
    icon: Cancel,
    label: 'Total Rejected',
    value: data.total,
    color: CUSTOMS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 5: Border Crossing KPIs
 */
export const getBorderCrossingKPIs = (data: {
  atBorder: number;
  crossed: number;
  delayed: number;
  total: number;
}): KPICard[] => [
  {
    icon: HourglassEmpty,
    label: 'At Border',
    value: data.atBorder,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Crossed Today',
    value: data.crossed,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Warning,
    label: 'Delayed',
    value: data.delayed,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: DirectionsBoat,
    label: 'Total Crossings',
    value: data.total,
    color: CUSTOMS_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 6: User Management KPIs
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
    color: CUSTOMS_BRAND_COLOR,
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
    color: CUSTOMS_BRAND_COLOR,
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
    color: CUSTOMS_SECONDARY_COLOR,
    format: 'number',
  },
];

/**
 * Get KPIs based on active tab
 */
export const getKPIsForTab = (tabIndex: number, data: any): KPICard[] => {
  switch (tabIndex) {
    case 0:
      return getSubmittedKPIs(data);
    case 1:
      return getInspectingKPIs(data);
    case 2:
      return getUnderReviewKPIs(data);
    case 3:
      return getClearedKPIs(data);
    case 4:
      return getRejectedKPIs(data);
    case 5:
      return getBorderCrossingKPIs(data);
    case 6:
      return getUserManagementKPIs(data);
    case 7:
      return getAuditTrailKPIs(data);
    default:
      return [];
  }
};
