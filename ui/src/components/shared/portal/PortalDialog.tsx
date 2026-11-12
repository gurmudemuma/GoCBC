// PortalDialog + PortalDialogActions + PortalField — the standard dialog
// and form-field set. Every portal previously hand-rolled its own
// DialogTitle / DialogActions padding / TextField props, with two or
// three different title-bar styles per portal. Standard:
//  - Title: icon + h6 + optional caption subtitle, close button at right.
//  - Content: p:3 (pt:2), fields in Grid spacing={2}, xs={12} sm/md={6}.
//  - Actions: px:3 py:2, #f5f5f5 background, top border, Cancel left +
//    primary submit right (GhostButton + PrimaryButton).
// Dialogs with a bespoke branded title bar (e.g. Shipping detail dialog,
// Banks SWIFT dialogs) keep their own DialogTitle but should still use
// PortalDialogActions + PortalField.
import React from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  IconButton,
  SxProps,
  TextField,
  TextFieldProps,
  Theme,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { PortalOrgKey } from './PortalBrand';

export interface PortalDialogProps extends Omit<DialogProps, 'title' | 'onClose'> {
  brand: PortalOrgKey;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Right-side title accessory (e.g. a status Chip) rendered before the close button. */
  titleAccessory?: React.ReactNode;
  onClose?: () => void;
  /** DialogActions content (typically GhostButton Cancel + PrimaryButton). */
  actions?: React.ReactNode;
  contentSx?: SxProps<Theme>;
}

export const PortalDialog: React.FC<PortalDialogProps> = ({
  brand: _brand,
  title,
  subtitle,
  icon,
  titleAccessory,
  onClose,
  actions,
  contentSx,
  children,
  ...rest
}) => (
  <Dialog fullWidth {...rest} onClose={onClose}>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {icon}
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {titleAccessory}
      {onClose ? (
        <IconButton onClick={onClose} size="small" aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      ) : null}
    </DialogTitle>
    <DialogContent sx={{ p: 3, pt: 2, ...(contentSx as object) }}>{children}</DialogContent>
    {actions ? <PortalDialogActions>{actions}</PortalDialogActions> : null}
  </Dialog>
);

export const PortalDialogActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DialogActions
    sx={{ px: 3, py: 2, bgcolor: '#f5f5f5', borderTop: '1px solid #e0e0e0', gap: 1 }}
  >
    {children}
  </DialogActions>
);

/** Standard form field: fullWidth outlined TextField (MUI defaults). */
export const PortalField: React.FC<TextFieldProps> = (props) => (
  <TextField fullWidth {...props} />
);

export default PortalDialog;
