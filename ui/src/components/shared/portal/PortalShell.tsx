// PortalShell — the standard outer layout every portal renders inside.
// Replaces each portal's hand-rolled root <Box> (different paddings and
// per-portal background gradients) with one layout: brand-tinted page
// background, a portal header (title in brand colour + subtitle + optional
// right-side actions) and a shared footer. The global system header
// (NavigationBar, with logo / user / logout / breadcrumbs) lives in
// pages/_app.tsx and is intentionally untouched.
import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { getPortalBrand, PortalOrgKey } from './PortalBrand';

export interface PortalShellProps {
  /** Per-portal brand token — the ONLY thing that differs between portals. */
  brand: PortalOrgKey;
  /** Portal title, rendered as an h4 in the brand colour. */
  title: React.ReactNode;
  /** Subtitle under the title. */
  subtitle?: React.ReactNode;
  /** Right-side header actions (e.g. refresh button, TestBlockchainButton). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Standard page background: a light wash of the brand colour. */
export function portalBackground(brand: PortalOrgKey): string {
  const b = getPortalBrand(brand);
  return `linear-gradient(135deg, ${alpha(b.primary, 0.05)} 0%, ${alpha(
    b.primary,
    0.02,
  )} 45%, #fffef5 100%)`;
}

export const PortalShell: React.FC<PortalShellProps> = ({
  brand,
  title,
  subtitle,
  actions,
  children,
}) => {
  const b = getPortalBrand(brand);
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: portalBackground(brand),
        p: { xs: 2, md: 3 },
      }}
    >
      {/* Portal header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: b.primary }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {actions ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>{actions}</Box>
        ) : null}
      </Box>

      {children}

      {/* Portal footer — identical on every portal */}
      <Box
        component="footer"
        sx={{
          mt: 4,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Ethiopian Coffee Export Consortium (CECBS) — {b.portalName} • {b.orgName}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          © 2026 CECBS • Hyperledger Fabric 2.5 • All rights reserved
        </Typography>
      </Box>
    </Box>
  );
};

export default PortalShell;
