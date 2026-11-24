// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Professional Portal Header Component with Logo and Branding

import React from 'react';
import { Box, Typography } from '@mui/material';
import OrganizationLogo from '@/components/OrganizationLogo';
import { organizationColors } from '@/theme/organizationThemes';

interface PortalHeaderProps {
  organization: 'ECTA' | 'NBE' | 'BANKS' | 'EXPORTER' | 'CUSTOMS' | 'SHIPPING' | 'ECX' | 'DEFAULT';
  title?: string;
  subtitle?: string;
  size?: 'small' | 'medium' | 'large';
}

const organizationNames = {
  ECTA: 'Ethiopian Coffee & Tea Authority',
  NBE: 'National Bank of Ethiopia',
  BANKS: 'Commercial Bank of Ethiopia',
  EXPORTER: 'Coffee Exporter Portal',
  CUSTOMS: 'Ethiopian Customs Commission',
  SHIPPING: 'Ethiopian Shipping Lines',
  ECX: 'Ethiopian Commodity Exchange',
  DEFAULT: 'CECBS Portal',
};

const sizeConfig = {
  small: { logoHeight: 40, titleSize: '1.25rem', subtitleSize: '0.875rem', padding: 2 },
  medium: { logoHeight: 50, titleSize: '1.75rem', subtitleSize: '1rem', padding: 3 },
  large: { logoHeight: 60, titleSize: '2.25rem', subtitleSize: '1.125rem', padding: 4 },
};

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  organization,
  title,
  subtitle,
  size = 'medium',
}) => {
  const colors = organizationColors[organization] || organizationColors.DEFAULT;
  const config = sizeConfig[size];

  return (
    <Box
      sx={{
        background: colors.gradient,
        color: '#ffffff',
        padding: config.padding,
        borderRadius: 2,
        marginBottom: 3,
        boxShadow: organization === 'BANKS' || organization === 'EXPORTER'
          ? '0 4px 16px rgba(0,0,0,0.3)'
          : organization === 'NBE'
          ? '0 4px 16px rgba(92, 74, 51, 0.3)'
          : '0 4px 16px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          background: organization === 'BANKS' || organization === 'EXPORTER'
            ? 'radial-gradient(circle at top right, rgba(255,215,0,0.2), transparent)'
            : organization === 'NBE'
            ? 'radial-gradient(circle at top right, rgba(196,165,116,0.2), transparent)'
            : 'radial-gradient(circle at top right, rgba(255,255,255,0.1), transparent)',
          pointerEvents: 'none',
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
        {/* Logo */}
        <Box>
          <OrganizationLogo
            role={organization}
            height={config.logoHeight}
            width={config.logoHeight * 3}
            variant="professional"
            showBorder={true}
          />
        </Box>

        {/* Title and Subtitle */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontSize: config.titleSize,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              mb: subtitle || title ? 0.5 : 0,
            }}
          >
            {title || organizationNames[organization]}
          </Typography>
          {subtitle && (
            <Typography
              variant="body1"
              sx={{
                fontSize: config.subtitleSize,
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 500,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// Compact header variant for internal pages
export const CompactPortalHeader: React.FC<{
  organization: PortalHeaderProps['organization'];
  title: string;
}> = ({ organization, title }) => {
  const colors = organizationColors[organization] || organizationColors.DEFAULT;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 2,
        borderBottom: organization === 'BANKS' || organization === 'EXPORTER'
          ? '3px solid #9b30b7'
          : organization === 'NBE'
          ? '3px solid #8B6F47'
          : `3px solid ${colors.primary}`,
        marginBottom: 2,
      }}
    >
      <OrganizationLogo
        role={organization}
        height={40}
        width={120}
        variant="professional"
        showBorder={true}
      />
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: organization === 'BANKS' || organization === 'EXPORTER'
            ? '#000000'
            : organization === 'NBE'
            ? '#5C4A33'
            : colors.primary,
        }}
      >
        {title}
      </Typography>
    </Box>
  );
};

export default PortalHeader;
