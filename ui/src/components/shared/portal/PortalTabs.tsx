// PortalTabs — the standard tab bar (+ optional sub-tabs) and tab panel.
// Unifies the per-portal MUI Tabs copies: same height, typography, brand
// selected colour and 3px indicator everywhere. Three sizes:
//  - 'standard': the normal tab bar (minHeight 48, 0.95rem)
//  - 'parent':   Banks-style parent bar (fullWidth, minHeight 70, 1rem, bold,
//    selected tab gets a white background + 3px bottom border, no indicator)
//  - 'child':    second-level bar (scrollable, minHeight 56, 0.875rem)
// Panels use the same helper every portal already had locally:
// a hidden <div> wrapping <Box sx={{ p: 3 }}>.
import React from 'react';
import { Box, Tab, Tabs, alpha } from '@mui/material';
import { getPortalBrand, PortalOrgKey } from './PortalBrand';

export interface PortalTabDef {
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Explicit tab value; defaults to the tab's index. */
  value?: number;
}

export interface PortalTabBarProps {
  brand: PortalOrgKey;
  value: number;
  onChange: (event: React.SyntheticEvent, value: number) => void;
  tabs: PortalTabDef[];
  variant?: 'standard' | 'parent' | 'child';
  /** Scrollable with auto scroll buttons (default false = standard variant). */
  scrollable?: boolean;
  /** Stretch tabs to fill the full width (ECTA / Customs pattern). */
  fullWidth?: boolean;
}

export const PortalTabBar: React.FC<PortalTabBarProps> = ({
  brand,
  value,
  onChange,
  tabs,
  variant = 'standard',
  scrollable = false,
  fullWidth = false,
}) => {
  const b = getPortalBrand(brand);
  const isParent = variant === 'parent';
  const isChild = variant === 'child';
  return (
    <Tabs
      value={value}
      onChange={onChange}
      variant={
        isParent || fullWidth ? 'fullWidth' : scrollable ? 'scrollable' : 'standard'
      }
      scrollButtons={scrollable && !isParent && !fullWidth ? 'auto' : undefined}
      sx={{
        borderBottom: 2,
        borderColor: 'divider',
        ...(isParent ? { bgcolor: '#f5f5f5' } : {}),
        '& .MuiTab-root': {
          minHeight: isParent ? 70 : isChild ? 56 : 48,
          textTransform: 'none',
          fontSize: isParent ? '1rem' : isChild ? '0.875rem' : '0.95rem',
          fontWeight: 600,
          color: isParent ? '#444' : '#666',
          ...(isParent ? { px: 3 } : {}),
          '&.Mui-selected': {
            color: b.primary,
            fontWeight: 700,
            ...(isParent
              ? { bgcolor: 'white', borderBottom: `3px solid ${b.primary}` }
              : { bgcolor: alpha(b.primary, 0.05) }),
          },
          '&:hover': {
            color: b.primary,
            ...(isParent
              ? { bgcolor: alpha(b.primary, 0.08) }
              : { bgcolor: alpha(b.primary, 0.03), opacity: 0.8 }),
          },
        },
        '& .MuiTabs-indicator': isParent
          ? { display: 'none' }
          : { height: 3, backgroundColor: b.primary, borderRadius: '3px 3px 0 0' },
      }}
    >
      {tabs.map((t, i) => (
        <Tab
          key={i}
          value={t.value ?? i}
          label={t.label}
          icon={t.icon as React.ReactElement | undefined}
          iconPosition="start"
          disabled={t.disabled}
        />
      ))}
    </Tabs>
  );
};

export interface PortalTabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

export const PortalTabPanel: React.FC<PortalTabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export default PortalTabBar;
