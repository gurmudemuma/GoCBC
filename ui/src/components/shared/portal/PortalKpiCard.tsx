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
        borderRadius: 3,
        textAlign: 'center',
        cursor: clickable ? 'pointer' : 'default',
        border: selected ? `3px solid ${accent}` : '2px solid transparent',
        bgcolor: selected ? `${accent}12` : 'white',
        background: selected 
          ? `linear-gradient(135deg, ${accent}08 0%, ${accent}18 100%)`
          : 'white',
        boxShadow: selected 
          ? `0 8px 24px ${accent}35, 0 4px 12px ${accent}25` 
          : '0 4px 12px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': selected ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}CC 100%)`,
        } : {},
        '&:hover': clickable
          ? {
              boxShadow: `0 12px 32px ${accent}40, 0 6px 16px ${accent}30`,
              transform: 'translateY(-6px) scale(1.02)',
              borderColor: accent,
              bgcolor: `${accent}05`,
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
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${accent}25 0%, ${accent}35 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5,
            color: accent,
            boxShadow: `0 6px 16px ${accent}30, 0 2px 8px ${accent}20`,
            transition: 'all 0.3s ease',
            '& .MuiSvgIcon-root': { 
              fontSize: 32,
              filter: `drop-shadow(0 2px 4px ${accent}50)`,
            },
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: '#555',
            textTransform: 'uppercase',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: 1,
            mb: 0.5,
          }}
        >
          {label}
        </Typography>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 800, 
            color: accent, 
            lineHeight: 1, 
            mt: 0.75,
            fontSize: '2.5rem',
            textShadow: `0 2px 8px ${accent}25`,
          }}
        >
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
