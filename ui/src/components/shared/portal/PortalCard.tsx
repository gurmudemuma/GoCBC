// PortalCard — the standard section/tab container.
// One Paper style for every portal: 8px radius, 1px #e0e0e0 border,
// soft shadow, hidden overflow, mb 3. Optional title renders the standard
// h6 section header (with optional subtitle + right-side actions) — this
// also fixes the old pattern of passing a `title` prop to ModernCard,
// which silently rendered nothing (ModernCard has no title prop).
import React from 'react';
import { Box, Paper, PaperProps, Typography } from '@mui/material';
import { PortalOrgKey } from './PortalBrand';

export interface PortalCardProps extends Omit<PaperProps, 'title'> {
  /** Per-portal brand token (kept for API symmetry; the card itself is neutral). */
  brand: PortalOrgKey;
  /** Standard h6 section header. */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-side header actions. */
  headerActions?: React.ReactNode;
  /** Skip the default content padding (e.g. tab containers: the tab bar
   *  sits flush at the top and PortalTabPanel supplies p:3 per panel). */
  noPadding?: boolean;
}

export const PortalCard: React.FC<PortalCardProps> = ({
  brand: _brand,
  title,
  subtitle,
  headerActions,
  noPadding = false,
  children,
  sx,
  ...rest
}) => (
  <Paper
    elevation={0}
    sx={{
      mb: 3,
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      border: '1px solid #e0e0e0',
      overflow: 'hidden',
      ...(sx as object),
    }}
    {...rest}
  >
    {title ? (
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {headerActions}
      </Box>
    ) : null}
    <Box sx={{ p: noPadding ? 0 : 3 }}>{children}</Box>
  </Paper>
);

export default PortalCard;
