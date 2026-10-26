// Responsive Design Helpers for Exporter Portal
// Ensures the portal works beautifully on all devices

import { SxProps, Theme } from '@mui/material';

// Responsive Grid Breakpoints
export const responsiveGridBreakpoints = {
  // KPI Cards
  kpiPrimary: {
    xs: 12,    // Full width on mobile
    sm: 12,    // Full width on small tablets
    md: 4,     // 1/3 width on desktop
  },
  kpiSecondary: {
    xs: 12,    // Full width on mobile
    sm: 6,     // Half width on tablets
    md: 2.67,  // 1/3 of remaining space on desktop
  },
  
  // Content Cards
  fullWidth: {
    xs: 12,
  },
  halfWidth: {
    xs: 12,
    md: 6,
  },
  thirdWidth: {
    xs: 12,
    sm: 6,
    md: 4,
  },
};

// Responsive Padding/Spacing
export const responsiveSpacing = {
  containerPadding: {
    xs: 2,
    sm: 3,
    md: 4,
  },
  cardPadding: {
    xs: 2,
    sm: 2.5,
    md: 3,
  },
  sectionSpacing: {
    xs: 2,
    sm: 3,
    md: 4,
  },
};

// Responsive Typography
export const responsiveTypography = {
  headerTitle: {
    xs: 'h5',
    sm: 'h4',
    md: 'h4',
  },
  kpiValue: {
    xs: 'h4',
    sm: 'h3',
    md: 'h2',
  },
  cardTitle: {
    xs: 'subtitle1',
    sm: 'h6',
    md: 'h6',
  },
};

// Mobile-Friendly Tab Styling
export const responsiveTabStyles: SxProps<Theme> = {
  borderBottom: 1,
  borderColor: 'divider',
  mb: { xs: 2, sm: 3 },
  '& .MuiTab-root': {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.9375rem' },
    minWidth: { xs: 'auto', sm: 120 },
    px: { xs: 1.5, sm: 2, md: 3 },
  },
  '& .Mui-selected': {
    color: '#7C3AED',
  },
  '& .MuiTabs-indicator': {
    backgroundColor: '#7C3AED',
    height: 3,
  },
};

// Responsive Header Styles
export const responsiveHeaderStyles: SxProps<Theme> = {
  background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
  color: 'white',
  py: { xs: 3, sm: 4 },
  px: { xs: 2, sm: 3 },
  borderRadius: 2,
  mb: { xs: 2, sm: 3 },
  boxShadow: '0 4px 20px rgba(124, 58, 237, 0.25)',
};

// Responsive Chart Container
export const responsiveChartStyles: SxProps<Theme> = {
  height: { xs: 250, sm: 300, md: 350 },
  width: '100%',
};

// Mobile Menu Styles
export const mobileMenuStyles: SxProps<Theme> = {
  display: { xs: 'block', md: 'none' },
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  bgcolor: 'white',
  boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
  zIndex: 1000,
};

// Desktop Header Actions
export const desktopHeaderStyles: SxProps<Theme> = {
  display: { xs: 'none', md: 'flex' },
  gap: 2,
  alignItems: 'center',
};

// Utility: Hide on Mobile/Desktop
export const hideOnMobile: SxProps<Theme> = {
  display: { xs: 'none', sm: 'block' },
};

export const hideOnDesktop: SxProps<Theme> = {
  display: { xs: 'block', sm: 'none' },
};

// Responsive Button Sizes
export const responsiveButtonSize = (
  defaultSize: 'small' | 'medium' | 'large' = 'medium'
): { xs: string; sm: string; md: string } => ({
  xs: defaultSize === 'large' ? 'medium' : 'small',
  sm: defaultSize === 'large' ? 'large' : 'medium',
  md: defaultSize,
});

// Stack Direction Helper
export const responsiveStack = (direction: 'row' | 'column' = 'row') => ({
  direction: { xs: 'column', sm: direction } as any,
  spacing: { xs: 2, sm: 2, md: 3 },
});

export default {
  responsiveGridBreakpoints,
  responsiveSpacing,
  responsiveTypography,
  responsiveTabStyles,
  responsiveHeaderStyles,
  responsiveChartStyles,
  mobileMenuStyles,
  desktopHeaderStyles,
  hideOnMobile,
  hideOnDesktop,
  responsiveButtonSize,
  responsiveStack,
};
