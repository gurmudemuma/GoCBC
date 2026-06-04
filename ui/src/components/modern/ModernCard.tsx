// Modern Glassmorphism Card Component - 2026 Design
// Reusable card with brand-colored glass effect

import React from 'react';
import { Card, CardProps, alpha, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

interface ModernCardProps extends CardProps {
  /**
   * Enable glassmorphism effect
   * @default true
   */
  glassmorphism?: boolean;
  
  /**
   * Enable hover lift effect
   * @default true
   */
  hoverLift?: boolean;
  
  /**
   * Intensity of the glass effect (0-1)
   * @default 0.1
   */
  glassIntensity?: number;
  
  /**
   * Custom brand color for tint (uses theme primary if not provided)
   */
  brandColor?: string;
}

const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => 
    !['glassmorphism', 'hoverLift', 'glassIntensity', 'brandColor'].includes(prop as string),
})<ModernCardProps>(({ theme, glassmorphism, hoverLift, glassIntensity = 0.1, brandColor }) => {
  const tintColor = brandColor || theme.palette.primary.main;
  
  return {
    borderRadius: 16,
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    
    // Glassmorphism effect
    ...(glassmorphism && {
      background: `linear-gradient(
        135deg,
        ${alpha('#ffffff', 0.9)} 0%,
        ${alpha(tintColor, 0.05)} 100%
      )`,
      backdropFilter: 'blur(20px)',
      border: `1px solid ${alpha(tintColor, 0.1)}`,
      boxShadow: `
        0 8px 32px 0 ${alpha(tintColor, 0.1)},
        0 0 0 1px ${alpha(tintColor, 0.05)}
      `,
    }),
    
    // Hover lift effect
    ...(hoverLift && {
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `
          0 12px 48px 0 ${alpha(tintColor, 0.15)},
          0 0 0 1px ${alpha(tintColor, 0.1)}
        `,
      },
    }),
    
    // Dark mode adjustments
    [theme.breakpoints.up('md')]: {
      ...(theme.palette.mode === 'dark' && glassmorphism && {
        background: `linear-gradient(
          135deg,
          ${alpha(tintColor, 0.2)} 0%,
          ${alpha('#000000', 0.6)} 100%
        )`,
        border: `1px solid ${alpha(tintColor, 0.3)}`,
      }),
    },
  };
});

/**
 * ModernCard - 2026 Glassmorphism Card Component
 * 
 * @example
 * ```tsx
 * // Basic usage with default glassmorphism
 * <ModernCard>
 *   <CardContent>Your content</CardContent>
 * </ModernCard>
 * 
 * // With custom brand color (e.g., ECTA green)
 * <ModernCard brandColor="#078930" hoverLift>
 *   <CardContent>Green-tinted card</CardContent>
 * </ModernCard>
 * 
 * // Without glassmorphism (solid card)
 * <ModernCard glassmorphism={false}>
 *   <CardContent>Solid card</CardContent>
 * </ModernCard>
 * ```
 */
export const ModernCard: React.FC<ModernCardProps> = ({
  glassmorphism = true,
  hoverLift = true,
  glassIntensity = 0.1,
  brandColor,
  children,
  ...props
}) => {
  return (
    <StyledCard
      glassmorphism={glassmorphism}
      hoverLift={hoverLift}
      glassIntensity={glassIntensity}
      brandColor={brandColor}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

export default ModernCard;
