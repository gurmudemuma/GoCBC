// Loading Skeleton Component - 2026 Design
// Content placeholder with brand-colored shimmer

import React from 'react';
import { Skeleton, SkeletonProps, Box, styled, alpha, keyframes } from '@mui/material';

interface LoadingSkeletonProps {
  /**
   * Skeleton variant type
   */
  variant?: 'card' | 'table' | 'list' | 'kpi' | 'custom';
  
  /**
   * Number of items to show (for list/table)
   */
  count?: number;
  
  /**
   * Custom brand color for shimmer
   */
  brandColor?: string;
  
  /**
   * Custom skeleton props (for variant="custom")
   */
  customProps?: SkeletonProps;
}

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const StyledSkeleton = styled(Skeleton, {
  shouldForwardProp: (prop) => prop !== 'brandColor',
})<{ brandColor?: string }>(({ theme, brandColor }) => {
  const color = brandColor || theme.palette.primary.main;
  
  return {
    backgroundColor: alpha(color, 0.08),
    
    '&::after': {
      background: `linear-gradient(
        90deg,
        transparent,
        ${alpha(color, 0.15)},
        transparent
      )`,
      animation: `${shimmer} 2s infinite`,
    },
  };
});

/**
 * LoadingSkeleton - 2026 Loading Placeholder Component
 * 
 * Pre-built skeleton layouts for common use cases
 * 
 * @example
 * ```tsx
 * // Card skeleton
 * <LoadingSkeleton variant="card" brandColor="#078930" />
 * 
 * // Table skeleton
 * <LoadingSkeleton variant="table" count={5} brandColor="#0F47AF" />
 * 
 * // List skeleton
 * <LoadingSkeleton variant="list" count={3} />
 * 
 * // KPI cards skeleton
 * <LoadingSkeleton variant="kpi" count={4} brandColor="#8B6F47" />
 * 
 * // Custom skeleton
 * <LoadingSkeleton 
 *   variant="custom" 
 *   customProps={{ width: 200, height: 40 }}
 * />
 * ```
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'card',
  count = 1,
  brandColor,
  customProps,
}) => {
  // Card skeleton
  if (variant === 'card') {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <StyledSkeleton
          brandColor={brandColor}
          variant="rectangular"
          width="100%"
          height={200}
          sx={{ borderRadius: 3, mb: 2 }}
        />
        <StyledSkeleton brandColor={brandColor} width="60%" height={24} sx={{ mb: 1 }} />
        <StyledSkeleton brandColor={brandColor} width="40%" height={20} />
      </Box>
    );
  }
  
  // Table skeleton
  if (variant === 'table') {
    return (
      <Box sx={{ width: '100%' }}>
        {/* Table header */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 2, bgcolor: alpha(brandColor || '#000', 0.03), borderRadius: 2 }}>
          <StyledSkeleton brandColor={brandColor} width="30%" height={24} />
          <StyledSkeleton brandColor={brandColor} width="25%" height={24} />
          <StyledSkeleton brandColor={brandColor} width="20%" height={24} />
          <StyledSkeleton brandColor={brandColor} width="25%" height={24} />
        </Box>
        
        {/* Table rows */}
        {Array.from({ length: count }).map((_, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1.5, p: 2 }}>
            <StyledSkeleton brandColor={brandColor} width="30%" height={20} />
            <StyledSkeleton brandColor={brandColor} width="25%" height={20} />
            <StyledSkeleton brandColor={brandColor} width="20%" height={20} />
            <StyledSkeleton brandColor={brandColor} width="25%" height={20} />
          </Box>
        ))}
      </Box>
    );
  }
  
  // List skeleton
  if (variant === 'list') {
    return (
      <Box sx={{ width: '100%' }}>
        {Array.from({ length: count }).map((_, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <StyledSkeleton
              brandColor={brandColor}
              variant="circular"
              width={48}
              height={48}
            />
            <Box sx={{ flex: 1 }}>
              <StyledSkeleton brandColor={brandColor} width="70%" height={20} sx={{ mb: 0.5 }} />
              <StyledSkeleton brandColor={brandColor} width="40%" height={16} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }
  
  // KPI skeleton
  if (variant === 'kpi') {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(count, 4)}, 1fr)`, gap: 3, width: '100%' }}>
        {Array.from({ length: count }).map((_, index) => (
          <Box key={index} sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
            <StyledSkeleton
              brandColor={brandColor}
              variant="rectangular"
              width={56}
              height={56}
              sx={{ borderRadius: 2, mb: 2 }}
            />
            <StyledSkeleton brandColor={brandColor} width="60%" height={20} sx={{ mb: 1 }} />
            <StyledSkeleton brandColor={brandColor} width="80%" height={32} sx={{ mb: 1 }} />
            <StyledSkeleton brandColor={brandColor} width="40%" height={16} />
          </Box>
        ))}
      </Box>
    );
  }
  
  // Custom skeleton
  if (variant === 'custom' && customProps) {
    return <StyledSkeleton brandColor={brandColor} {...customProps} />;
  }
  
  return null;
};

export default LoadingSkeleton;
