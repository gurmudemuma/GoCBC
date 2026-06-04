// Dashboard KPI Card Component - 2026 Design
// Animated KPI/stat card with icons and trends

import React from 'react';
import {
  Box,
  Typography,
  alpha,
  styled,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import { ModernCard } from './ModernCard';

interface DashboardKPIProps {
  /**
   * KPI title
   */
  title: string;
  
  /**
   * Main value to display
   */
  value: string | number;
  
  /**
   * Icon component
   */
  icon?: React.ReactNode;
  
  /**
   * Trend direction
   */
  trend?: 'up' | 'down' | 'flat';
  
  /**
   * Trend value (e.g., "+12%")
   */
  trendValue?: string;
  
  /**
   * Custom brand color
   */
  brandColor?: string;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Click handler for navigation
   */
  onClick?: () => void;
  
  /**
   * Subtitle or description
   */
  subtitle?: string;
}

const KPICard = styled(ModernCard, {
  shouldForwardProp: (prop) => prop !== 'clickable',
})<{ clickable?: boolean }>(({ clickable }) => ({
  padding: 24,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  cursor: clickable ? 'pointer' : 'default',
  
  ...(clickable && {
    '&:active': {
      transform: 'scale(0.98)',
    },
  }),
}));

const IconContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'brandColor',
})<{ brandColor?: string }>(({ theme, brandColor }) => {
  const color = brandColor || theme.palette.primary.main;
  
  return {
    width: 56,
    height: 56,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.2)} 100%)`,
    marginBottom: 16,
    transition: 'all 0.3s ease',
    
    '& svg': {
      fontSize: 28,
      color: color,
    },
    
    '.MuiCard-root:hover &': {
      transform: 'scale(1.1) rotate(5deg)',
      background: `linear-gradient(135deg, ${alpha(color, 0.2)} 0%, ${alpha(color, 0.3)} 100%)`,
    },
  };
});

const TrendContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'trend',
})<{ trend?: 'up' | 'down' | 'flat' }>(({ trend }) => {
  const colors = {
    up: '#4caf50',
    down: '#f44336',
    flat: '#ff9800',
  };
  
  const color = trend ? colors[trend] : colors.flat;
  
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 6,
    backgroundColor: alpha(color, 0.1),
    color: color,
    fontSize: '0.875rem',
    fontWeight: 600,
    marginTop: 8,
    
    '& svg': {
      fontSize: 18,
    },
  };
});

const ValueTypography = styled(Typography)({
  fontSize: '2rem',
  fontWeight: 700,
  marginTop: 'auto',
  marginBottom: 4,
  background: 'linear-gradient(135deg, currentColor 0%, currentColor 100%)',
  WebkitBackgroundClip: 'text',
  
  animation: 'counter-up 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
  '@keyframes counter-up': {
    '0%': {
      opacity: 0,
      transform: 'translateY(20px)',
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
});

/**
 * DashboardKPI - 2026 KPI Card Component
 * 
 * Features:
 * - Animated value display
 * - Trend indicators with icons
 * - Brand-colored icons
 * - Loading skeletons
 * - Click for navigation
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <DashboardKPI
 *   title="Total Applications"
 *   value={1234}
 *   icon={<DescriptionIcon />}
 *   trend="up"
 *   trendValue="+12%"
 *   brandColor="#078930"
 * />
 * 
 * // Clickable with navigation
 * <DashboardKPI
 *   title="Pending Approvals"
 *   value={45}
 *   icon={<PendingIcon />}
 *   onClick={() => navigate('/approvals')}
 *   brandColor="#0F47AF"
 *   subtitle="Requires attention"
 * />
 * 
 * // Loading state
 * <DashboardKPI
 *   title="Revenue"
 *   value="$0"
 *   loading={true}
 * />
 * ```
 */
export const DashboardKPI: React.FC<DashboardKPIProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  brandColor,
  loading,
  onClick,
  subtitle,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon />;
      case 'down':
        return <TrendingDownIcon />;
      case 'flat':
        return <TrendingFlatIcon />;
      default:
        return null;
    }
  };
  
  return (
    <KPICard
      brandColor={brandColor}
      clickable={!!onClick}
      onClick={onClick}
      elevation={onClick ? 2 : 1}
    >
      {loading ? (
        <>
          <Skeleton variant="rectangular" width={56} height={56} sx={{ borderRadius: 3, mb: 2 }} />
          <Skeleton width="60%" height={24} sx={{ mb: 1 }} />
          <Skeleton width="80%" height={40} sx={{ mt: 'auto' }} />
          <Skeleton width="40%" height={20} sx={{ mt: 1 }} />
        </>
      ) : (
        <>
          {icon && (
            <IconContainer brandColor={brandColor}>
              {icon}
            </IconContainer>
          )}
          
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontSize: '0.75rem',
            }}
          >
            {title}
          </Typography>
          
          {subtitle && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {subtitle}
            </Typography>
          )}
          
          <ValueTypography
            variant="h3"
            color="text.primary"
          >
            {value}
          </ValueTypography>
          
          {trend && trendValue && (
            <TrendContainer trend={trend}>
              {getTrendIcon()}
              {trendValue}
            </TrendContainer>
          )}
        </>
      )}
    </KPICard>
  );
};

export default DashboardKPI;
