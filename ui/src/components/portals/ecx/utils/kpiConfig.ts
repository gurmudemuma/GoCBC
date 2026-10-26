// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Portal - KPI Configuration
// Defines KPI cards for each tab

import React from 'react';
import {
  Warehouse,
  Assignment,
  CheckCircle,
  Coffee,
  TrendingUp,
  Science,
  LocalShipping,
  Warning,
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

interface KPIStats {
  warehoused: number;
  graded: number;
  assigned: number;
  released: number;
  total: number;
  avgQualityScore: number;
  totalWeight: number;
  grade1Count: number;
}

const ECX_COLORS = {
  primary: '#0F47AF',
  secondary: '#FCDD09',
  success: '#4caf50',
  warning: '#f57c00',
  error: '#d32f2f',
  info: '#2196f3',
};

export const getECXKPIConfig = (
  activeTab: number,
  stats: KPIStats,
  colors: typeof ECX_COLORS = ECX_COLORS
): KPICard[] => {
  
  // Tab 0: Lot Management KPIs
  if (activeTab === 0) {
    return [
      {
        icon: React.createElement(Warehouse),
        label: 'Warehoused',
        value: stats.warehoused || 0,
        color: colors.info,
        subtitle: 'Pending Grading',
        description: 'Lots received at ECX warehouses',
        clickable: false,
      },
      {
        icon: React.createElement(Science),
        label: 'Graded',
        value: stats.graded || 0,
        color: colors.primary,
        subtitle: 'Quality Assessed',
        description: 'Lots graded by ECX officers',
        clickable: false,
      },
      {
        icon: React.createElement(Assignment),
        label: 'Assigned',
        value: stats.assigned || 0,
        color: colors.warning,
        subtitle: 'Contract Linked',
        description: 'Lots assigned to sales contracts',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Released',
        value: stats.released || 0,
        color: colors.success,
        subtitle: 'Ready for Export',
        description: 'Lots released to exporters',
        clickable: false,
      },
    ];
  }
  
  // Tab 1: Market Prices KPIs
  if (activeTab === 1) {
    return [
      {
        icon: React.createElement(TrendingUp),
        label: 'Avg Price',
        value: '$8.75',
        color: colors.success,
        subtitle: 'Per Kg (Jun 2026)',
        description: 'Average market price across all origins',
        clickable: false,
      },
      {
        icon: React.createElement(Coffee),
        label: 'Premium Origins',
        value: '4',
        color: colors.primary,
        subtitle: 'Yirgacheffe, Sidama, Harar, Guji',
        description: 'Specialty coffee regions',
        clickable: false,
      },
      {
        icon: React.createElement(TrendingUp),
        label: 'Price Trend',
        value: '+12.5%',
        color: colors.success,
        subtitle: 'YTD Growth',
        description: 'Year-to-date price increase',
        clickable: false,
      },
      {
        icon: React.createElement(LocalShipping),
        label: 'Volume Traded',
        value: `${((stats.totalWeight || 0) / 1000000).toFixed(1)}M`,
        color: colors.warning,
        subtitle: 'Kg This Season',
        description: 'Total coffee traded through ECX',
        clickable: false,
      },
    ];
  }
  
  // Tab 2: Grading Standards KPIs
  if (activeTab === 2) {
    return [
      {
        icon: React.createElement(Science),
        label: 'Avg Quality Score',
        value: stats.avgQualityScore ? stats.avgQualityScore.toFixed(1) : '—',
        color: colors.success,
        subtitle: 'SCA Cupping Score',
        description: 'Average quality across all lots',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Grade 1 & 2',
        value: stats.grade1Count || 0,
        color: colors.primary,
        subtitle: 'Premium Quality',
        description: 'Lots rated Grade 1 or Grade 2',
        clickable: false,
      },
      {
        icon: React.createElement(Coffee),
        label: 'Export Eligible',
        value: `${stats.graded ? Math.round((stats.grade1Count / stats.graded) * 100) : 0}%`,
        color: colors.success,
        subtitle: 'Compliance Rate',
        description: 'Percentage meeting export standards',
        clickable: false,
      },
      {
        icon: React.createElement(Warning),
        label: 'Rejected',
        value: stats.total - stats.released - stats.assigned - stats.graded - stats.warehoused,
        color: colors.error,
        subtitle: 'Below Standard',
        description: 'Lots rejected for export',
        clickable: false,
      },
    ];
  }
  
  // Tab 3: User Management KPIs
  if (activeTab === 3) {
    return [
      {
        icon: React.createElement(Warehouse),
        label: 'Warehouse Staff',
        value: '—',
        color: colors.primary,
        subtitle: 'Active Users',
        clickable: false,
      },
      {
        icon: React.createElement(Science),
        label: 'Grading Officers',
        value: '—',
        color: colors.success,
        subtitle: 'Certified Graders',
        clickable: false,
      },
      {
        icon: React.createElement(Assignment),
        label: 'ECX Officers',
        value: '—',
        color: colors.warning,
        subtitle: 'System Access',
        clickable: false,
      },
      {
        icon: React.createElement(CheckCircle),
        label: 'Active Sessions',
        value: '—',
        color: colors.info,
        subtitle: 'Currently Online',
        clickable: false,
      },
    ];
  }
  
  // Default KPIs (fallback)
  return [
    {
      icon: React.createElement(Coffee),
      label: 'Total Lots',
      value: stats.total || 0,
      color: colors.primary,
      subtitle: 'All Registered',
      clickable: false,
    },
    {
      icon: React.createElement(CheckCircle),
      label: 'Processed',
      value: stats.graded || 0,
      color: colors.success,
      subtitle: 'Graded & Released',
      clickable: false,
    },
    {
      icon: React.createElement(Warehouse),
      label: 'In Warehouse',
      value: stats.warehoused || 0,
      color: colors.warning,
      subtitle: 'Pending Processing',
      clickable: false,
    },
    {
      icon: React.createElement(TrendingUp),
      label: 'Avg Quality',
      value: stats.avgQualityScore ? stats.avgQualityScore.toFixed(1) : '—',
      color: colors.info,
      subtitle: 'SCA Score',
      clickable: false,
    },
  ];
};

export default getECXKPIConfig;
