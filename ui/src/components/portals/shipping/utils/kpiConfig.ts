import {
  CheckCircle,
  LocalShipping,
  Anchor,
  Inventory,
  DirectionsBoat,
  LocationOn,
  HourglassEmpty,
  Schedule,
  Assignment,
  Warning,
  TrendingUp,
  AttachMoney,
  Person,
  Group,
  AdminPanelSettings,
  Block,
  FlightTakeoff,
  Traffic,
  Speed,
} from '@mui/icons-material';

/**
 * Shipping Portal KPI Configuration
 * 
 * Context-aware KPIs that change based on active tab
 * Each tab shows 4 relevant KPI cards
 */

export interface KPICard {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  format?: 'number' | 'currency' | 'percentage' | 'days' | 'hours';
}

// Brand colors
export const SHIPPING_BRAND_COLOR = '#00838f'; // Cyan
export const SHIPPING_SECONDARY_COLOR = '#0097a7'; // Light cyan
const SUCCESS_COLOR = '#2e7d32';
const WARNING_COLOR = '#ed6c02';
const ERROR_COLOR = '#d32f2f';
const INFO_COLOR = '#0288d1';

/**
 * Tab 0: Clearance KPIs
 */
export const getClearanceKPIs = (data: {
  ready: number;
  preparing: number;
  delayed: number;
  total: number;
}): KPICard[] => [
  {
    icon: CheckCircle,
    label: 'Ready for Transport',
    value: data.ready,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: HourglassEmpty,
    label: 'Preparing',
    value: data.preparing,
    color: INFO_COLOR,
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
    icon: Assignment,
    label: 'Total Cleared',
    value: data.total,
    color: SHIPPING_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 1: Land Transport KPIs
 */
export const getLandTransportKPIs = (data: {
  inTransit: number;
  onSchedule: number;
  delayed: number;
  avgTransitTime: number;
}): KPICard[] => [
  {
    icon: LocalShipping,
    label: 'In Transit',
    value: data.inTransit,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'On Schedule',
    value: data.onSchedule,
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
    icon: Schedule,
    label: 'Avg Transit (hrs)',
    value: data.avgTransitTime,
    color: SHIPPING_BRAND_COLOR,
    format: 'hours',
  },
];

/**
 * Tab 2: Port Arrival KPIs
 */
export const getPortArrivalKPIs = (data: {
  arrived: number;
  pending: number;
  todayArrivals: number;
  total: number;
}): KPICard[] => [
  {
    icon: Anchor,
    label: 'Arrived Today',
    value: data.todayArrivals,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: LocalShipping,
    label: 'En Route',
    value: data.pending,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'At Port',
    value: data.arrived,
    color: SHIPPING_SECONDARY_COLOR,
    format: 'number',
  },
  {
    icon: Assignment,
    label: 'Total Arrivals',
    value: data.total,
    color: SHIPPING_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 3: Container Stuffing KPIs
 */
export const getContainerStuffingKPIs = (data: {
  inProgress: number;
  completed: number;
  scheduled: number;
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
    icon: Inventory,
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
    label: 'Total Containers',
    value: data.total,
    color: SHIPPING_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 4: Vessel Loading KPIs
 */
export const getVesselLoadingKPIs = (data: {
  loading: number;
  loaded: number;
  pending: number;
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
    icon: DirectionsBoat,
    label: 'Loading Now',
    value: data.loading,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'Loaded',
    value: data.loaded,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: Assignment,
    label: 'Total Vessels',
    value: data.total,
    color: SHIPPING_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 5: Departed KPIs
 */
export const getDepartedKPIs = (data: {
  todayDepartures: number;
  weekDepartures: number;
  onSchedule: number;
  total: number;
}): KPICard[] => [
  {
    icon: FlightTakeoff,
    label: 'Departed Today',
    value: data.todayDepartures,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: TrendingUp,
    label: 'This Week',
    value: data.weekDepartures,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'On Schedule',
    value: data.onSchedule,
    color: SHIPPING_SECONDARY_COLOR,
    format: 'number',
  },
  {
    icon: DirectionsBoat,
    label: 'Total Departed',
    value: data.total,
    color: SHIPPING_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 6: In Transit KPIs
 */
export const getInTransitKPIs = (data: {
  inTransit: number;
  onSchedule: number;
  delayed: number;
  avgDaysRemaining: number;
}): KPICard[] => [
  {
    icon: DirectionsBoat,
    label: 'In Transit',
    value: data.inTransit,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'On Schedule',
    value: data.onSchedule,
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
    icon: Schedule,
    label: 'Avg Days Left',
    value: data.avgDaysRemaining,
    color: SHIPPING_BRAND_COLOR,
    format: 'days',
  },
];

/**
 * Tab 7: Destination Arrived KPIs
 */
export const getDestinationArrivedKPIs = (data: {
  arrived: number;
  todayArrivals: number;
  awaitingClearance: number;
  total: number;
}): KPICard[] => [
  {
    icon: LocationOn,
    label: 'Arrived Today',
    value: data.todayArrivals,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: CheckCircle,
    label: 'At Destination',
    value: data.arrived,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: HourglassEmpty,
    label: 'Awaiting Clearance',
    value: data.awaitingClearance,
    color: WARNING_COLOR,
    format: 'number',
  },
  {
    icon: Assignment,
    label: 'Total Arrivals',
    value: data.total,
    color: SHIPPING_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 8: Delivered KPIs
 */
export const getDeliveredKPIs = (data: {
  todayDelivered: number;
  weekDelivered: number;
  onTime: number;
  total: number;
}): KPICard[] => [
  {
    icon: CheckCircle,
    label: 'Delivered Today',
    value: data.todayDelivered,
    color: SUCCESS_COLOR,
    format: 'number',
  },
  {
    icon: TrendingUp,
    label: 'This Week',
    value: data.weekDelivered,
    color: INFO_COLOR,
    format: 'number',
  },
  {
    icon: Speed,
    label: 'On-Time Rate',
    value: `${data.onTime}%`,
    color: SHIPPING_SECONDARY_COLOR,
  },
  {
    icon: Assignment,
    label: 'Total Delivered',
    value: data.total,
    color: SHIPPING_BRAND_COLOR,
    format: 'number',
  },
];

/**
 * Tab 9: Users KPIs
 */
export const getUsersKPIs = (data: {
  totalUsers: number;
  activeUsers: number;
  admins: number;
  inactiveUsers: number;
}): KPICard[] => [
  {
    icon: Group,
    label: 'Total Users',
    value: data.totalUsers,
    color: SHIPPING_BRAND_COLOR,
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
 * Get KPIs based on active tab
 */
export const getKPIsForTab = (tabIndex: number, data: any): KPICard[] => {
  switch (tabIndex) {
    case 0:
      return getClearanceKPIs(data);
    case 1:
      return getLandTransportKPIs(data);
    case 2:
      return getPortArrivalKPIs(data);
    case 3:
      return getContainerStuffingKPIs(data);
    case 4:
      return getVesselLoadingKPIs(data);
    case 5:
      return getDepartedKPIs(data);
    case 6:
      return getInTransitKPIs(data);
    case 7:
      return getDestinationArrivedKPIs(data);
    case 8:
      return getDeliveredKPIs(data);
    case 9:
      return getUsersKPIs(data);
    default:
      return [];
  }
};
