// Theme Toggle Component - 2026 Design
// Dark mode toggle with smooth animation

import React from 'react';
import { IconButton, Tooltip, styled, alpha } from '@mui/material';
import {
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
} from '@mui/icons-material';

interface ThemeToggleProps {
  /**
   * Current theme mode
   */
  mode: 'light' | 'dark';
  
  /**
   * Toggle handler
   */
  onToggle: () => void;
  
  /**
   * Custom brand color
   */
  brandColor?: string;
}

const StyledIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'brandColor',
})<{ brandColor?: string }>(({ theme, brandColor }) => {
  const color = brandColor || theme.palette.primary.main;
  
  return {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: alpha(color, 0.1),
    
    '&:hover': {
      backgroundColor: alpha(color, 0.2),
      transform: 'scale(1.1)',
    },
    
    '& svg': {
      color: color,
      fontSize: 24,
      transition: 'all 0.3s ease',
    },
    
    '&:active': {
      transform: 'scale(0.95)',
    },
  };
});

/**
 * ThemeToggle - 2026 Dark Mode Toggle Component
 * 
 * Smooth animated toggle between light and dark themes
 * 
 * @example
 * ```tsx
 * const [mode, setMode] = useState<'light' | 'dark'>('light');
 * 
 * <ThemeToggle
 *   mode={mode}
 *   onToggle={() => setMode(mode === 'light' ? 'dark' : 'light')}
 *   brandColor="#078930"
 * />
 * ```
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  mode,
  onToggle,
  brandColor,
}) => {
  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
      <StyledIconButton
        onClick={onToggle}
        brandColor={brandColor}
        aria-label="toggle theme"
      >
        {mode === 'light' ? (
          <Brightness4Icon
            sx={{
              animation: 'rotate-in 0.3s ease',
              '@keyframes rotate-in': {
                '0%': {
                  transform: 'rotate(-180deg) scale(0)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'rotate(0deg) scale(1)',
                  opacity: 1,
                },
              },
            }}
          />
        ) : (
          <Brightness7Icon
            sx={{
              animation: 'rotate-in 0.3s ease',
              '@keyframes rotate-in': {
                '0%': {
                  transform: 'rotate(180deg) scale(0)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'rotate(0deg) scale(1)',
                  opacity: 1,
                },
              },
            }}
          />
        )}
      </StyledIconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
