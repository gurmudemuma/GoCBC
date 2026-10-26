// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Professional Organization Logo Component with System Color Scheme

import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { Coffee } from '@mui/icons-material';
import { organizationColors } from '@/theme/organizationThemes';

type Props = {
  role: string;
  height?: number;
  width?: number;
  variant?: 'standard' | 'professional' | 'compact';
  showBorder?: boolean;
};

const logoMap: Record<string, string> = {
  BANKS: '/logo/cbe.png',
  NBE: '/logo/nbe.jpg',
  ECTA: '/logo/ecta.png',
  ECX: '/logo/ecx.jpg',
  CUSTOMS: '/logo/customx.png',
  SHIPPING: '/logo/shipping.png',
  EXPORTER: '/logo/ecta.png', // Exporters use ECTA logo
};

export default function OrganizationLogo({ 
  role, 
  height = 40, 
  width,
  variant = 'professional',
  showBorder = true,
}: Props) {
  const src = logoMap[role];
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [fit, setFit] = useState<'cover' | 'contain'>('contain');
  const [imgLoaded, setImgLoaded] = useState(false);

  // Get organization-specific colors
  const colors = organizationColors[role as keyof typeof organizationColors] || organizationColors.DEFAULT;

  useEffect(() => {
    // If no src or running server-side, keep default
    if (!src || typeof window === 'undefined') return;

    // Create an off-DOM image to detect natural size
    const probe = new Image();
    probe.src = src;
    probe.onload = () => {
      try {
        const w = probe.naturalWidth || 0;
        const h = probe.naturalHeight || 0;
        if (w === 0 || h === 0) return;
        const aspect = w / h;
        // If logo is very wide, use contain to avoid cropping important content
        if (aspect > 2.2) {
          setFit('contain');
        } else {
          setFit('contain'); // Changed default to contain for professional look
        }
        setImgLoaded(true);
      } catch (e) {
        // ignore
      }
    };
    probe.onerror = () => {
      // fallback: contain
      setFit('contain');
    };
  }, [src]);

  if (!src) {
    return <Coffee sx={{ fontSize: height, color: colors.primary }} />;
  }

  const badgeSize = width ?? Math.max(Math.round(height * 3), 60);

  // Professional variant with enhanced styling
  if (variant === 'professional') {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: showBorder 
            ? role === 'BANKS' || role === 'EXPORTER'
              ? '3px solid #9b30b7'
              : role === 'NBE'
              ? '3px solid #8B6F47'
              : `3px solid ${colors.primary}`
            : 'none',
          boxShadow: role === 'BANKS' || role === 'EXPORTER'
            ? '0 4px 12px rgba(155, 48, 183, 0.3)'
            : role === 'NBE'
            ? '0 4px 12px rgba(139, 111, 71, 0.3)'
            : '0 4px 12px rgba(0,0,0,0.15)',
          width: `${badgeSize}px`,
          height: `${height}px`,
          padding: '10px',
          overflow: 'visible',
          transition: 'all 0.3s ease',
          opacity: imgLoaded ? 1 : 0.7,
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: role === 'BANKS' || role === 'EXPORTER'
              ? '0 6px 20px rgba(155, 48, 183, 0.4)'
              : role === 'NBE'
              ? '0 6px 20px rgba(139, 111, 71, 0.4)'
              : '0 6px 20px rgba(0,0,0,0.25)',
          },
        }}
      >
        <Box
          component="img"
          ref={imgRef}
          src={src}
          alt={`${role} Logo`}
          sx={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
          onLoad={() => setImgLoaded(true)}
        />
      </Box>
    );
  }

  // Compact variant - minimal styling
  if (variant === 'compact') {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: showBorder ? `2px solid ${colors.primary}` : 'none',
          width: `${badgeSize}px`,
          height: `${height}px`,
          padding: '8px',
          overflow: 'visible',
        }}
      >
        <Box
          component="img"
          ref={imgRef}
          src={src}
          alt={`${role} Logo`}
          sx={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Box>
    );
  }

  // Standard variant - original behavior with subtle enhancement
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderRadius: 1,
        boxShadow: 'none',
        width: `${badgeSize}px`,
        height: `${height}px`,
        overflow: 'visible',
        padding: '4px',
      }}
    >
      <Box
        component="img"
        ref={imgRef}
        src={src}
        alt={`${role} Logo`}
        sx={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
          backgroundColor: 'transparent',
        }}
      />
    </Box>
  );
}
