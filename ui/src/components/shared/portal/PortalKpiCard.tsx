// PortalKpiCard — the standard KPI/stat card.
// Unifies the hand-rolled KPI cards in every portal (same shape Banks,
// Exporter and Customs already used): fixed height, centred column, a
// 48px circular icon badge tinted with the accent colour, uppercase
// caption label, bold h4 value. Accent defaults to the portal brand;
// per-card status colours (green/orange/red/blue) keep being passed in.
import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { getPortalBrand, PortalOrgKey } from './PortalBrand';

export interface PortalKpiCardProps {
  brand: PortalOrgKey;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  /** Accent colour for icon/value/border. Defaults to the brand primary. */
  color?: string;
  subtitle?: string;
  /** Click handler — also makes the card hover-lift and show a pointer. */
  onClick?: () => void;
  /** Selected state (e.g. active KPI filter): 2px accent border + tint. */
  selected?: boolean;
}

export const PortalKpiCard: React.FC<PortalKpiCardProps> = ({
  brand,
  icon,
  label,
  value,
  color,
  subtitle,
  onClick,
  selected = false,
}) => {
  const b = getPortalBrand(brand);
  const accent = color || b.primary;
  const clickable = Boolean(onClick);
  return (
    <Card
      onClick={onClick}
      sx={{
        height: 140,
        borderRadius: 2,
        textAlign: 'center',
        cursor: clickable ? 'pointer' : 'default',
        border: selected ? `2px solid ${accent}` : '1px solid #e0e0e0',
        bgcolor: selected ? `${accent}08` : 'white',
        boxShadow: selected ? `0 4px 12px ${accent}40` : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': clickable
          ? {
              boxShadow: `0 8px 24px ${accent}40`,
              transform: 'translateY(-4px)',
              borderColor: accent,
            }
          : {},
      }}
    >
      <CardContent
        sx={{
          py: 2.5,
          px: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          '&:last-child': { pb: 2.5 },
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: `${accent}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1,
            color: accent,
            '& .MuiSvgIcon-root': { fontSize: 28 },
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: '#666',
            textTransform: 'uppercase',
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: accent, lineHeight: 1, mt: 0.5 }}>
          {value}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default PortalKpiCard;
