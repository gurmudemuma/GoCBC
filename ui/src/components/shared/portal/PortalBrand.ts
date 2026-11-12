// Portal brand tokens — single source of truth for per-portal branding.
// Re-exports the existing organisation palette from the app theme so the
// design system never invents a new colour. Each portal passes its org key;
// layout components resolve the colours from here, so only the colour
// changes per portal — never the layout.
import { organizationColors } from '@/theme/organizationThemes';

export type PortalOrgKey =
  | 'ECTA'
  | 'ECX'
  | 'NBE'
  | 'BANKS'
  | 'CUSTOMS'
  | 'SHIPPING'
  | 'EXPORTER';

export interface PortalBrand {
  /** Primary brand colour (tab indicator, primary buttons, KPI accents, header title). */
  primary: string;
  /** Secondary / accent colour. */
  secondary: string;
  /** Dark shade (primary-button hover, gradients). */
  dark: string;
  /** Light shade. */
  light: string;
  /** Brand gradient (AppBar / hero use). */
  gradient: string;
  /** Full organisation display name (footer / header subtitle). */
  orgName: string;
  /** Short portal display name. */
  portalName: string;
}

const ORG_NAMES: Record<PortalOrgKey, { orgName: string; portalName: string }> = {
  ECTA: { orgName: 'Ethiopian Coffee & Tea Authority', portalName: 'ECTA Portal' },
  ECX: { orgName: 'Ethiopian Commodity Exchange', portalName: 'ECX Portal' },
  NBE: { orgName: 'National Bank of Ethiopia', portalName: 'NBE Portal' },
  BANKS: { orgName: 'Commercial Bank of Ethiopia', portalName: 'Banks Portal' },
  CUSTOMS: { orgName: 'Ethiopian Customs Commission', portalName: 'Customs Portal' },
  SHIPPING: { orgName: 'Ethiopian Shipping Lines', portalName: 'Shipping Portal' },
  EXPORTER: { orgName: 'Coffee Exporter', portalName: 'Exporter Portal' },
};

/** Canonical brand tokens per portal — values come from theme/organizationThemes. */
export const PORTAL_BRANDS: Record<PortalOrgKey, PortalBrand> = (
  Object.keys(ORG_NAMES) as PortalOrgKey[]
).reduce((acc, key) => {
  const c = organizationColors[key];
  acc[key] = {
    primary: c.primary,
    secondary: c.secondary,
    dark: c.dark,
    light: c.light,
    gradient: c.gradient,
    orgName: ORG_NAMES[key].orgName,
    portalName: ORG_NAMES[key].portalName,
  };
  return acc;
}, {} as Record<PortalOrgKey, PortalBrand>);

export function getPortalBrand(org: PortalOrgKey): PortalBrand {
  return PORTAL_BRANDS[org];
}
