// PortalButton — the standard button variants, brand-resolved.
// Every portal previously repeated the same inline sx
// (`bgcolor: BRAND_COLOR`, hover shade, outlined purple, …) per button,
// with occasional typos (#7a2592 vs #7a2692). These four wrappers are the
// only button styles portals should use:
//  - PrimaryButton   contained, flat brand colour, hover brand-dark
//  - SecondaryButton outlined, brand border + text, hover brand tint
//  - DangerButton    contained MUI error (reject / delete)
//  - GhostButton     plain text button (Cancel / Close)
// Loading/success dialog submits keep using the shared AnimatedButton
// (it has spinner + success-check behaviour); its brandColor should be
// the portal brand.
import React from 'react';
import { alpha, Button, ButtonProps } from '@mui/material';
import { getPortalBrand, PortalOrgKey } from './PortalBrand';

type PortalButtonProps = ButtonProps & {
  brand: PortalOrgKey;
  /** Anchor download attribute (MUI's ButtonProps type omits it). */
  download?: boolean | string;
};

function mergeSx(base: object, sx: ButtonProps['sx']): ButtonProps['sx'] {
  return [base, ...(Array.isArray(sx) ? sx : [sx])] as ButtonProps['sx'];
}

export const PrimaryButton: React.FC<PortalButtonProps> = ({ brand, sx, ...props }) => {
  const b = getPortalBrand(brand);
  return (
    <Button
      variant="contained"
      {...props}
      sx={mergeSx(
        {
          bgcolor: b.primary,
          '&:hover': { bgcolor: b.dark },
          textTransform: 'none',
          fontWeight: 600,
        },
        sx,
      )}
    />
  );
};

export const SecondaryButton: React.FC<PortalButtonProps> = ({ brand, sx, ...props }) => {
  const b = getPortalBrand(brand);
  return (
    <Button
      variant="outlined"
      {...props}
      sx={mergeSx(
        {
          borderColor: b.primary,
          color: b.primary,
          '&:hover': { borderColor: b.dark, bgcolor: alpha(b.primary, 0.05) },
          textTransform: 'none',
          fontWeight: 600,
        },
        sx,
      )}
    />
  );
};

export const DangerButton: React.FC<PortalButtonProps> = ({ brand: _brand, sx, ...props }) => (
  <Button
    variant="contained"
    color="error"
    {...props}
    sx={mergeSx({ textTransform: 'none', fontWeight: 600 }, sx)}
  />
);

export const GhostButton: React.FC<PortalButtonProps> = ({ brand: _brand, sx, ...props }) => (
  <Button
    variant="text"
    {...props}
    sx={mergeSx({ textTransform: 'none', fontWeight: 600 }, sx)}
  />
);
