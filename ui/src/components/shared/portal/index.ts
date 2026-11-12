// Shared portal design system — one layout, per-portal brand colour.
// Every portal renders PortalShell (header + footer + brand-tinted page),
// PortalTabBar / PortalTabPanel, PortalKpiCard, PortalCard, PortalButton,
// PortalDialog (+ PortalDialogActions, PortalField) and PortalDataGrid,
// passing its org key as `brand`. Only the colour changes per portal.
// Status chips, empty states and loading skeletons are re-exported from
// the existing modern/ library so there is exactly one of each.
export { getPortalBrand, PORTAL_BRANDS } from './PortalBrand';
export type { PortalOrgKey, PortalBrand } from './PortalBrand';
export { PortalShell, portalBackground } from './PortalShell';
export type { PortalShellProps } from './PortalShell';
export { PortalTabBar, PortalTabPanel } from './PortalTabs';
export type { PortalTabBarProps, PortalTabPanelProps, PortalTabDef } from './PortalTabs';
export { PortalKpiCard } from './PortalKpiCard';
export type { PortalKpiCardProps } from './PortalKpiCard';
export { PortalCard } from './PortalCard';
export type { PortalCardProps } from './PortalCard';
export { PrimaryButton, SecondaryButton, DangerButton, GhostButton } from './PortalButton';
export { PortalDialog, PortalDialogActions, PortalField } from './PortalDialog';
export type { PortalDialogProps } from './PortalDialog';
export { PortalDataGrid } from './PortalDataGrid';
export type { PortalDataGridProps } from './PortalDataGrid';

// Re-exported from the existing modern/ library (single source of truth):
export { StatusChip } from '@/components/modern/StatusChip';
export type { StatusType } from '@/components/modern/StatusChip';
export { EmptyState } from '@/components/modern/EmptyState';
export type { EmptyStateType } from '@/components/modern/EmptyState';
export { LoadingSkeleton } from '@/components/modern/LoadingSkeleton';
export { AnimatedButton } from '@/components/modern/AnimatedButton';
