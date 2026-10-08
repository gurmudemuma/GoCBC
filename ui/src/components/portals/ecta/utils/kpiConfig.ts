// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECTA Portal - KPI Configuration
// Defines KPI cards for each tab

import React from 'react';
import {
  Assignment,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Science,
  Description,
  TrendingUp,
  Warning,
  Refresh,
  Person,
  Timeline,
  Assessment,
  DirectionsBoat,
  Coffee,
} from '@mui/icons-material';

interface KPICard {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  subtitle: string;
  description?: string;
  clickable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

interface ECTAStats {
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

const ECTA_COLORS = {
  primary: '#2e7d32',
  secondary: '#8BC34A',
  success: '#4caf50',
  warning: '#f57c00',
  error: '#d32f2f',
  info: '#2196f3',
};

export const getECTAKPIConfig = (
  activeTab: number,
  stats: ECTAStats,
  colors: typeof ECTA_COLORS = ECTA_COLORS
): KPICard[] => {
  
  // Tab 0: Pending Applications
  if (activeTab === 0) {
    return [
      {
        icon: React.createElement(HourglassEmpty),
        label: 'Pending Review',
        value: stats.pendingApplications || 0,
        color: colors.warning,
        subtitle: 'Awaiting Approval',
        description: 'New exporter applications pending review',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Approved',
        value: stats.approvedExporters || 0,
        color: colors.success,
        subtitle: 'Active Exporters',
        description: 'Total approved exporters',
        clickable: false,
      },
      {
        icon: React.createElement(Cancel),
        label: 'Rejected',
        value: stats.rejectedApplications || 0,
        color: colors.error,
        subtitle: 'Denied Applications',
        description: 'Applications that did not meet requirements',
        clickable: false,
      },
      {
        icon: React.createElement(Assignment),
        label: 'Total Applications',
        value: stats.totalApplications || 0,
        color: colors.primary,
        subtitle: 'All Time',
        description: 'Total applications received',
        clickable: false,
      },
    ];
  }
  
  // Tab 1: Approved Exporters
  if (activeTab === 1) {
    return [
      {
        icon: React.createElement(CheckCircle),
        label: 'Active Licenses',
        value: stats.activeLicenses || 0,
        color: colors.success,
        subtitle: 'Currently Valid',
        description: 'Exporters with active ECTA licenses',
        clickable: false,
      },
      {
        icon: React.createElement(Warning),
        label: 'Expiring Soon',
        value: stats.expiringLicenses || 0,
        color: colors.warning,
        subtitle: 'Within 30 Days',
        description: 'Licenses expiring soon',
        clickable: false,
      },
      {
        icon: React.createElement(Cancel),
        label: 'Expired',
        value: stats.expiredLicenses || 0,
        color: colors.error,
        subtitle: 'Need Renewal',
        description: 'Expired licenses requiring renewal',
        clickable: false,
      },
      {
        icon: React.createElement(TrendingUp),
        label: 'Total Exporters',
        value: stats.approvedExporters || 0,
        color: colors.primary,
        subtitle: 'All Time',
        description: 'Total approved exporters',
        clickable: false,
      },
    ];
  }
  
  // Tab 2: Contract Approval
  if (activeTab === 2) {
    return [
      {
        icon: React.createElement(HourglassEmpty),
        label: 'Pending Review',
        value: stats.pendingContracts || 0,
        color: colors.warning,
        subtitle: 'Awaiting Approval',
        description: 'Contracts pending ECTA review',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Approved',
        value: stats.approvedContracts || 0,
        color: colors.success,
        subtitle: 'Verified',
        description: 'Contracts approved for export',
        clickable: false,
      },
      {
        icon: React.createElement(Cancel),
        label: 'Rejected',
        value: stats.rejectedContracts || 0,
        color: colors.error,
        subtitle: 'Non-Compliant',
        description: 'Contracts rejected',
        clickable: false,
      },
      {
        icon: React.createElement(Description),
        label: 'Total Contracts',
        value: stats.totalContracts || 0,
        color: colors.primary,
        subtitle: 'All Submissions',
        description: 'Total contracts submitted',
        clickable: false,
      },
    ];
  }
  
  // Tab 3: Quality Control
  if (activeTab === 3) {
    return [
      {
        icon: React.createElement(Science),
        label: 'Pending Inspection',
        value: stats.pendingInspections || 0,
        color: colors.warning,
        subtitle: 'Scheduled',
        description: 'Shipments awaiting quality inspection',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Passed',
        value: stats.passedInspections || 0,
        color: colors.success,
        subtitle: 'Quality Approved',
        description: 'Inspections passed',
        clickable: false,
      },
      {
        icon: React.createElement(Cancel),
        label: 'Failed',
        value: stats.failedInspections || 0,
        color: colors.error,
        subtitle: 'Below Standard',
        description: 'Inspections failed',
        clickable: false,
      },
      {
        icon: React.createElement(Assessment),
        label: 'Pass Rate',
        value: stats.completedInspections 
          ? `${Math.round((stats.passedInspections / stats.completedInspections) * 100)}%`
          : '—',
        color: colors.info,
        subtitle: 'Quality Compliance',
        description: 'Percentage of passed inspections',
        clickable: false,
      },
    ];
  }
  
  // Tab 4: License Renewals
  if (activeTab === 4) {
    return [
      {
        icon: React.createElement(Refresh),
        label: 'Pending Renewal',
        value: stats.renewalsPending || 0,
        color: colors.warning,
        subtitle: 'Awaiting Processing',
        description: 'Renewal applications pending',
        clickable: false,
      },
      {
        icon: React.createElement(Warning),
        label: 'Expiring Soon',
        value: stats.expiringLicenses || 0,
        color: colors.error,
        subtitle: 'Within 30 Days',
        description: 'Urgent renewals required',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Active Licenses',
        value: stats.activeLicenses || 0,
        color: colors.success,
        subtitle: 'Valid',
        description: 'Currently active licenses',
        clickable: false,
      },
      {
        icon: React.createElement(Cancel),
        label: 'Expired',
        value: stats.expiredLicenses || 0,
        color: colors.info,
        subtitle: 'Inactive',
        description: 'Expired licenses',
        clickable: false,
      },
    ];
  }
  
  // Tab 5: Analytics Dashboard
  if (activeTab === 5) {
    return [
      {
        icon: React.createElement(Assessment),
        label: 'System Analytics',
        value: '—',
        color: colors.primary,
        subtitle: 'Comprehensive Dashboard',
        clickable: false,
      },
      {
        icon: React.createElement(TrendingUp),
        label: 'Export Growth',
        value: '—',
        color: colors.success,
        subtitle: 'Performance Metrics',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Compliance Rate',
        value: '—',
        color: colors.info,
        subtitle: 'Quality Standards',
        clickable: false,
      },
      {
        icon: React.createElement(Assignment),
        label: 'Active Exporters',
        value: stats.approvedExporters || 0,
        color: colors.warning,
        subtitle: 'Licensed',
        clickable: false,
      },
    ];
  }
  
  // Tab 6: Pre-Shipment Inspection
  if (activeTab === 6) {
    return [
      {
        icon: React.createElement(DirectionsBoat),
        label: 'Pending Inspection',
        value: stats.pendingInspections || 0,
        color: colors.warning,
        subtitle: 'Scheduled',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Cleared',
        value: stats.passedInspections || 0,
        color: colors.success,
        subtitle: 'Ready to Ship',
        clickable: false,
      },
      {
        icon: React.createElement(Warning),
        label: 'Holds',
        value: stats.failedInspections || 0,
        color: colors.error,
        subtitle: 'Issues Found',
        clickable: false,
      },
      {
        icon: React.createElement(Assessment),
        label: 'Completion Rate',
        value: stats.completedInspections 
          ? `${Math.round((stats.completedInspections / (stats.pendingInspections + stats.completedInspections)) * 100)}%`
          : '—',
        color: colors.info,
        subtitle: 'Efficiency',
        clickable: false,
      },
    ];
  }
  
  // Tab 7: User Management
  if (activeTab === 7) {
    return [
      {
        icon: React.createElement(Person),
        label: 'Total Users',
        value: '—',
        color: colors.primary,
        subtitle: 'All Roles',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Active Users',
        value: '—',
        color: colors.success,
        subtitle: 'Currently Active',
        clickable: false,
      },
      {
        icon: React.createElement(Person),
        label: 'ECTA Officers',
        value: '—',
        color: colors.warning,
        subtitle: 'Staff',
        clickable: false,
      },
      {
        icon: React.createElement(Person),
        label: 'Administrators',
        value: '—',
        color: colors.info,
        subtitle: 'Admin Access',
        clickable: false,
      },
    ];
  }
  
  // Tab 8: Audit Trail
  if (activeTab === 8) {
    return [
      {
        icon: React.createElement(Timeline),
        label: 'Total Activities',
        value: '—',
        color: colors.primary,
        subtitle: 'All Actions',
        clickable: false,
      },
      {
        icon: React.createElement(Assessment),
        label: 'Today\'s Actions',
        value: '—',
        color: colors.success,
        subtitle: 'Last 24 Hours',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Verified',
        value: '—',
        color: colors.info,
        subtitle: 'Blockchain Records',
        clickable: false,
      },
      {
        icon: React.createElement(Person),
        label: 'Active Users',
        value: '—',
        color: colors.warning,
        subtitle: 'Participants',
        clickable: false,
      },
    ];
  }
  
  // Tab 9: Post-Delivery Audits
  if (activeTab === 9) {
    return [
      {
        icon: React.createElement(Coffee),
        label: 'Pending Audits',
        value: '—',
        color: colors.warning,
        subtitle: 'Scheduled',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Completed',
        value: '—',
        color: colors.success,
        subtitle: 'Verified',
        clickable: false,
      },
      {
        icon: React.createElement(Warning),
        label: 'Issues Found',
        value: '—',
        color: colors.error,
        subtitle: 'Non-Compliant',
        clickable: false,
      },
      {
        icon: React.createElement(Assessment),
        label: 'Compliance Rate',
        value: '—',
        color: colors.info,
        subtitle: 'Quality Standard',
        clickable: false,
      },
    ];
  }
  
  // Default KPIs (fallback)
  return [
    {
      icon: React.createElement(Assignment),
      label: 'Applications',
      value: stats.pendingApplications || 0,
      color: colors.warning,
      subtitle: 'Pending',
      clickable: false,
    },
    {
      icon: React.createElement(CheckCircle),
      label: 'Approved',
      value: stats.approvedExporters || 0,
      color: colors.success,
      subtitle: 'Exporters',
      clickable: false,
    },
    {
      icon: React.createElement(Science),
      label: 'Inspections',
      value: stats.pendingInspections || 0,
      color: colors.primary,
      subtitle: 'Pending',
      clickable: false,
    },
    {
      icon: React.createElement(Description),
      label: 'Contracts',
      value: stats.pendingContracts || 0,
      color: colors.info,
      subtitle: 'Pending',
      clickable: false,
    },
  ];
};

export default getECTAKPIConfig;
