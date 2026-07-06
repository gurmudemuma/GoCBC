// Status Chip Component - 2026 Design
// Animated status indicator with brand colors

import React from 'react';
import { Chip, ChipProps, alpha, styled, keyframes } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

export type StatusType =
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'processing'
  | 'info'
  | 'warning'
  | 'success'
  | 'error'
  | 'default'
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING'
  | 'PROCESSING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'UNDER_INSPECTION'
  | 'QUALITY_APPROVED'
  | 'PERMIT_ISSUED'
  | 'CLEARED'
  | 'HELD'
  | 'REGISTERED'
  | 'TRADING'
  | 'SOLD'
  | 'SHIPPED'
  | 'BOOKED'
  | 'LOADED'
  | 'DEPARTED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'ALLOCATED'
  | 'UTILIZED'
  | 'ISSUED'
  | 'EXPIRED'
  | 'REQUESTED'
  | 'DOCUMENTS_SUBMITTED'
  | 'VERIFIED'
  | 'SWIFT_INITIATED'
  | 'SWIFT_RECEIVED'
  | 'SETTLED'
  | 'SENT'
  | 'RECEIVED'
  | 'DRAFT'
  | 'COMPLETED'
  | 'CREATED';

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  /**
   * Status type
   */
  status: StatusType;
  
  /**
   * Show icon
   * @default true
   */
  showIcon?: boolean;
  
  /**
   * Enable pulse animation
   * @default false
   */
  pulse?: boolean;
  
  /**
   * Custom brand color (overrides status color)
   */
  brandColor?: string;
}

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;

const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) =>
    !['status', 'pulse', 'brandColor', 'userRole'].includes(prop as string),
})<{
  status: StatusType;
  pulse?: boolean;
  brandColor?: string;
  userRole?: string;
}>(({ theme, status, pulse: shouldPulse, brandColor, userRole }) => {
  // For BANKS and EXPORTER: Use only Black, White, Purple, Golden
  const isRestrictedRole = userRole === 'BANKS' || userRole === 'EXPORTER';
  
  const restrictedColors = {
    // Success/Approved = Golden
    success: { bg: alpha('#FFD700', 0.15), text: '#000000', border: '#FFD700' },
    // Error/Rejected = Purple
    error: { bg: alpha('#9b30b7', 0.15), text: '#000000', border: '#9b30b7' },
    // Pending/Warning = Golden
    pending: { bg: alpha('#FFD700', 0.15), text: '#000000', border: '#FFD700' },
    // Processing/Info = Purple
    processing: { bg: alpha('#9b30b7', 0.15), text: '#000000', border: '#9b30b7' },
    // Default = Black
    default: { bg: alpha('#000000', 0.08), text: '#000000', border: '#000000' },
  };
  
  const statusColors: Record<StatusType, { bg: string; text: string; border: string }> = isRestrictedRole ? {
    // All approved/success states = Golden
    approved: restrictedColors.success,
    APPROVED: restrictedColors.success,
    ACTIVE: restrictedColors.success,
    CLEARED: restrictedColors.success,
    ALLOCATED: restrictedColors.success,
    UTILIZED: restrictedColors.success,
    ISSUED: restrictedColors.success,
    SOLD: restrictedColors.success,
    DELIVERED: restrictedColors.success,
    VERIFIED: restrictedColors.success,
    SETTLED: restrictedColors.success,
    RECEIVED: restrictedColors.success,
    success: restrictedColors.success,
    QUALITY_APPROVED: restrictedColors.success,
    PERMIT_ISSUED: restrictedColors.success,
    COMPLETED: restrictedColors.success,
    
    // All rejected/error states = Purple
    rejected: restrictedColors.error,
    REJECTED: restrictedColors.error,
    SUSPENDED: restrictedColors.error,
    REVOKED: restrictedColors.error,
    HELD: restrictedColors.error,
    EXPIRED: restrictedColors.error,
    error: restrictedColors.error,
    
    // All pending/warning states = Golden  
    pending: restrictedColors.pending,
    PENDING: restrictedColors.pending,
    REQUESTED: restrictedColors.pending,
    BOOKED: restrictedColors.pending,
    REGISTERED: restrictedColors.pending,
    warning: restrictedColors.pending,
    UNDER_INSPECTION: restrictedColors.pending,
    DRAFT: restrictedColors.pending,
    
    // All processing/info states = Purple
    processing: restrictedColors.processing,
    PROCESSING: restrictedColors.processing,
    SUBMITTED: restrictedColors.processing,
    DOCUMENTS_SUBMITTED: restrictedColors.processing,
    UNDER_REVIEW: restrictedColors.processing,
    TRADING: restrictedColors.processing,
    LOADED: restrictedColors.processing,
    DEPARTED: restrictedColors.processing,
    IN_TRANSIT: restrictedColors.processing,
    SWIFT_INITIATED: restrictedColors.processing,
    SWIFT_RECEIVED: restrictedColors.processing,
    SENT: restrictedColors.processing,
    ARRIVED: restrictedColors.processing,
    SHIPPED: restrictedColors.processing,
    info: restrictedColors.processing,
    CREATED: restrictedColors.processing,
    
    default: restrictedColors.default,
  } : {
    // Original colors for other roles
    approved: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    APPROVED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    ACTIVE: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    CLEARED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    ALLOCATED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    UTILIZED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    ISSUED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    SOLD: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    DELIVERED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    VERIFIED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    SETTLED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    RECEIVED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    success: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    rejected: { bg: alpha('#f44336', 0.15), text: '#c62828', border: '#f44336' },
    REJECTED: { bg: alpha('#f44336', 0.15), text: '#c62828', border: '#f44336' },
    SUSPENDED: { bg: alpha('#ff9800', 0.15), text: '#e65100', border: '#ff9800' },
    REVOKED: { bg: alpha('#f44336', 0.15), text: '#c62828', border: '#f44336' },
    HELD: { bg: alpha('#f44336', 0.15), text: '#c62828', border: '#f44336' },
    EXPIRED: { bg: alpha('#9e9e9e', 0.15), text: '#616161', border: '#9e9e9e' },
    error: { bg: alpha('#f44336', 0.15), text: '#c62828', border: '#f44336' },
    pending: { bg: alpha('#ff9800', 0.15), text: '#e65100', border: '#ff9800' },
    PENDING: { bg: alpha('#ff9800', 0.15), text: '#e65100', border: '#ff9800' },
    REQUESTED: { bg: alpha('#ff9800', 0.15), text: '#e65100', border: '#ff9800' },
    BOOKED: { bg: alpha('#ff9800', 0.15), text: '#e65100', border: '#ff9800' },
    REGISTERED: { bg: alpha('#ff9800', 0.15), text: '#e65100', border: '#ff9800' },
    processing: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    PROCESSING: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    SUBMITTED: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    DOCUMENTS_SUBMITTED: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    UNDER_REVIEW: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    UNDER_INSPECTION: { bg: alpha('#ff9800', 0.15), text: '#e65100', border: '#ff9800' },
    QUALITY_APPROVED: { bg: alpha('#8bc34a', 0.15), text: '#558b2f', border: '#8bc34a' },
    PERMIT_ISSUED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    TRADING: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    LOADED: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    DEPARTED: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    IN_TRANSIT: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    SWIFT_INITIATED: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    SWIFT_RECEIVED: { bg: alpha('#3f51b5', 0.15), text: '#283593', border: '#3f51b5' },
    SENT: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    ARRIVED: { bg: alpha('#00bcd4', 0.15), text: '#006064', border: '#00bcd4' },
    SHIPPED: { bg: alpha('#673ab7', 0.15), text: '#4527a0', border: '#673ab7' },
    info: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    warning: { bg: alpha('#ff9800', 0.15), text: '#e65100', border: '#ff9800' },
    DRAFT: { bg: alpha('#9e9e9e', 0.15), text: '#616161', border: '#9e9e9e' },
    COMPLETED: { bg: alpha('#4caf50', 0.15), text: '#2e7d32', border: '#4caf50' },
    CREATED: { bg: alpha('#2196f3', 0.15), text: '#1565c0', border: '#2196f3' },
    default: { bg: alpha(theme.palette.text.primary, 0.08), text: theme.palette.text.primary, border: alpha(theme.palette.text.primary, 0.3) },
  };
  
  // Use brand color if provided, otherwise use status color with fallback to default
  const colors = brandColor
    ? {
        bg: alpha(brandColor, 0.15),
        text: brandColor,
        border: brandColor,
      }
    : (statusColors[status] || statusColors.default);
  
  return {
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1.5px solid ${colors.border}`,
    fontWeight: 600,
    fontSize: '0.75rem',
    padding: '4px 8px',
    height: 28,
    borderRadius: 6,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    
    '& .MuiChip-icon': {
      color: colors.text,
      fontSize: 18,
      marginLeft: 4,
    },
    
    '& .MuiChip-label': {
      padding: '0 8px',
    },
    
    '&:hover': {
      backgroundColor: alpha(colors.border, 0.25),
      transform: 'scale(1.05)',
      boxShadow: `0 2px 8px ${alpha(colors.border, 0.3)}`,
    },
    
    ...(shouldPulse && {
      animation: `${pulse} 2s ease-in-out infinite`,
    }),
  };
});

const getStatusIcon = (status: StatusType): React.ReactElement => {
  const upperStatus = status.toUpperCase();
  
  // Success/Approved states
  if (['APPROVED', 'SUCCESS', 'ACTIVE', 'CLEARED', 'ALLOCATED', 'UTILIZED', 'ISSUED', 'SOLD', 'DELIVERED', 'VERIFIED', 'SETTLED', 'RECEIVED', 'COMPLETED'].includes(upperStatus)) {
    return <CheckCircleIcon />;
  }
  
  // Error/Rejected states
  if (['REJECTED', 'ERROR', 'HELD', 'REVOKED'].includes(upperStatus)) {
    return <CancelIcon />;
  }
  
  // Warning states
  if (['SUSPENDED', 'EXPIRED', 'WARNING'].includes(upperStatus)) {
    return <WarningIcon />;
  }
  
  // Pending states
  if (['PENDING', 'BOOKED', 'REGISTERED', 'REQUESTED', 'DRAFT'].includes(upperStatus)) {
    return <ScheduleIcon />;
  }
  
  // Processing/In-Progress states
  if (['PROCESSING', 'SUBMITTED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'UNDER_INSPECTION', 'TRADING', 'LOADED', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED', 'SHIPPED', 'SWIFT_INITIATED', 'SWIFT_RECEIVED', 'SENT', 'CREATED'].includes(upperStatus)) {
    return <HourglassEmptyIcon />;
  }
  
  // Intermediate success states
  if (['QUALITY_APPROVED', 'PERMIT_ISSUED'].includes(upperStatus)) {
    return <CheckCircleIcon />;
  }
  
  // Default
  return <InfoIcon />;
};

const getStatusLabel = (status: StatusType): string => {
  // Format the status label nicely
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * StatusChip - 2026 Status Indicator Component
 * 
 * Features:
 * - Pre-defined status types with colors
 * - Animated hover effects
 * - Optional pulse animation
 * - Brand color override
 * - Icons for each status
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <StatusChip status="approved" />
 * <StatusChip status="pending" />
 * <StatusChip status="rejected" />
 * 
 * // With pulse animation for active states
 * <StatusChip status="processing" pulse />
 * 
 * // Custom label and icon
 * <StatusChip 
 *   status="approved" 
 *   label="Payment Verified"
 *   showIcon={false}
 * />
 * 
 * // With brand color (e.g., ECTA green)
 * <StatusChip 
 *   status="approved" 
 *   brandColor="#078930"
 *   label="Quality Approved"
 * />
 * ```
 */
export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  showIcon = true,
  pulse = false,
  brandColor,
  label,
  ...props
}) => {
  const { user } = useAuth();
  
  return (
    <StyledChip
      status={status}
      pulse={pulse}
      brandColor={brandColor}
      userRole={user?.role}
      label={label || getStatusLabel(status)}
      icon={showIcon ? getStatusIcon(status) : undefined}
      {...props}
    />
  );
};

export default StatusChip;
