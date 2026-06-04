// Animated Button Component - 2026 Design
// Button with loading/success states and brand gradients

import React, { useState } from 'react';
import {
  Button,
  ButtonProps,
  CircularProgress,
  styled,
  alpha,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';

interface AnimatedButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Async onClick handler
   */
  onClick?: () => Promise<void> | void;
  
  /**
   * Show loading state
   */
  loading?: boolean;
  
  /**
   * Show success state after completion
   * @default true
   */
  showSuccess?: boolean;
  
  /**
   * Success state duration in ms
   * @default 2000
   */
  successDuration?: number;
  
  /**
   * Custom brand color for gradient
   */
  brandColor?: string;
  
  /**
   * Secondary color for gradient
   */
  secondaryColor?: string;
  
  /**
   * Enable gradient background
   * @default true for contained variant
   */
  gradient?: boolean;
}

const StyledButton = styled(Button, {
  shouldForwardProp: (prop) =>
    !['brandColor', 'secondaryColor', 'gradient', 'success'].includes(prop as string),
})<{
  brandColor?: string;
  secondaryColor?: string;
  gradient?: boolean;
  success?: boolean;
}>(({ theme, brandColor, secondaryColor, gradient, success, variant }) => {
  const primary = brandColor || theme.palette.primary.main;
  const secondary = secondaryColor || theme.palette.secondary.main;
  
  return {
    position: 'relative',
    borderRadius: 8,
    padding: '10px 28px',
    fontWeight: 600,
    textTransform: 'none',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    
    // Gradient for contained variant
    ...(variant === 'contained' && gradient && {
      background: success
        ? `linear-gradient(135deg, ${secondary} 0%, ${secondary} 100%)`
        : `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
      color: '#ffffff',
      border: 'none',
      
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(135deg, ${alpha(secondary, 0.3)} 0%, ${alpha(primary, 0.3)} 100%)`,
        opacity: 0,
        transition: 'opacity 0.3s ease',
      },
      
      '&:hover::before': {
        opacity: 1,
      },
      
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 6px 20px ${alpha(primary, 0.3)}`,
      },
      
      '&:active': {
        transform: 'translateY(0)',
      },
      
      '&.Mui-disabled': {
        background: alpha(primary, 0.3),
        color: alpha('#ffffff', 0.5),
      },
    }),
    
    // Outlined variant
    ...(variant === 'outlined' && {
      borderColor: primary,
      color: primary,
      borderWidth: 2,
      
      '&:hover': {
        borderWidth: 2,
        borderColor: secondary,
        backgroundColor: alpha(primary, 0.05),
        transform: 'translateY(-2px)',
      },
    }),
    
    // Text variant
    ...(variant === 'text' && {
      color: primary,
      
      '&:hover': {
        backgroundColor: alpha(primary, 0.08),
      },
    }),
    
    // Success state
    ...(success && {
      background: `${secondary} !important`,
      
      '&:hover': {
        background: `${secondary} !important`,
        transform: 'scale(1.02)',
      },
    }),
  };
});

const ButtonContent = styled('span')<{ visible: boolean }>(({ visible }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  opacity: visible ? 1 : 0,
  transition: 'opacity 0.2s ease',
}));

const LoadingContainer = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * AnimatedButton - 2026 Button Component
 * 
 * Features:
 * - Async onClick with loading state
 * - Success animation after completion
 * - Brand-colored gradients
 * - Smooth transitions
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <AnimatedButton onClick={handleSubmit}>
 *   Submit
 * </AnimatedButton>
 * 
 * // With brand colors (e.g., ECTA green)
 * <AnimatedButton 
 *   brandColor="#078930" 
 *   secondaryColor="#6d4c41"
 *   onClick={async () => {
 *     await saveData();
 *   }}
 * >
 *   Save Application
 * </AnimatedButton>
 * 
 * // Outlined variant
 * <AnimatedButton variant="outlined" brandColor="#0F47AF">
 *   Cancel
 * </AnimatedButton>
 * ```
 */
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onClick,
  loading: externalLoading,
  showSuccess = true,
  successDuration = 2000,
  brandColor,
  secondaryColor,
  gradient = true,
  variant = 'contained',
  disabled,
  children,
  ...props
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const loading = externalLoading ?? internalLoading;
  const isDisabled = disabled || loading || success;
  
  const handleClick = async () => {
    if (!onClick || loading || success) return;
    
    try {
      const result = onClick();
      
      // Check if it's a Promise
      if (result instanceof Promise) {
        setInternalLoading(true);
        await result;
        setInternalLoading(false);
        
        // Show success state
        if (showSuccess) {
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
          }, successDuration);
        }
      }
    } catch (error) {
      setInternalLoading(false);
      console.error('Button action failed:', error);
      throw error;
    }
  };
  
  return (
    <StyledButton
      onClick={handleClick}
      disabled={isDisabled}
      variant={variant}
      brandColor={brandColor}
      secondaryColor={secondaryColor}
      gradient={gradient}
      success={success}
      {...props}
    >
      <ButtonContent visible={!loading && !success}>
        {children}
      </ButtonContent>
      
      {loading && (
        <LoadingContainer>
          <CircularProgress
            size={20}
            sx={{
              color: variant === 'contained' ? '#ffffff' : brandColor || 'primary.main',
            }}
          />
        </LoadingContainer>
      )}
      
      {success && (
        <LoadingContainer>
          <CheckIcon
            sx={{
              color: '#ffffff',
              animation: 'checkmark-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              '@keyframes checkmark-pop': {
                '0%': {
                  transform: 'scale(0)',
                },
                '50%': {
                  transform: 'scale(1.2)',
                },
                '100%': {
                  transform: 'scale(1)',
                },
              },
            }}
          />
        </LoadingContainer>
      )}
    </StyledButton>
  );
};

export default AnimatedButton;
