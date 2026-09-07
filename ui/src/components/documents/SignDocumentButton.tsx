/**
 * SignDocumentButton Component
 * Button component for signing documents with blockchain-backed cryptographic signatures
 */

import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Draw as DrawIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Verified as VerifiedIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface SignDocumentButtonProps {
  documentId: string;
  documentName?: string;
  onSignSuccess?: (signatureData: any) => void;
  onSignError?: (error: string) => void;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  disabled?: boolean;
  allowedTypes?: Array<'UPLOAD' | 'VERIFY' | 'APPROVE' | 'REJECT'>;
  defaultType?: 'UPLOAD' | 'VERIFY' | 'APPROVE' | 'REJECT';
  showIcon?: boolean;
  fullWidth?: boolean;
}

const SignDocumentButton: React.FC<SignDocumentButtonProps> = ({
  documentId,
  documentName,
  onSignSuccess,
  onSignError,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  disabled = false,
  allowedTypes = ['UPLOAD', 'VERIFY', 'APPROVE', 'REJECT'],
  defaultType = 'APPROVE',
  showIcon = true,
  fullWidth = false,
}) => {
  const [open, setOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<'UPLOAD' | 'VERIFY' | 'APPROVE' | 'REJECT'>(
    defaultType
  );
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    setError(null);
    setSuccess(false);
    setRemarks('');
    setSignatureType(defaultType);
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
      setError(null);
      setSuccess(false);
    }
  };

  const handleSign = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await axios.post(
        `http://localhost:3001/api/v1/documents/${documentId}/sign`,
        {
          signatureType,
          remarks: remarks.trim() || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSuccess(true);
        
        // Call success callback
        if (onSignSuccess) {
          onSignSuccess(response.data.data);
        }

        // Auto-close after 2 seconds
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        throw new Error(response.data.error?.message || 'Failed to sign document');
      }
    } catch (err: any) {
      console.error('Error signing document:', err);
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to sign document';
      setError(errorMessage);
      
      // Call error callback
      if (onSignError) {
        onSignError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getSignatureTypeInfo = (type: string) => {
    switch (type) {
      case 'APPROVE':
        return {
          label: 'Approve',
          description: 'Approve this document and add green signature stamp',
          icon: <CheckCircleIcon />,
          color: 'success' as const,
        };
      case 'REJECT':
        return {
          label: 'Reject',
          description: 'Reject this document with reason',
          icon: <CancelIcon />,
          color: 'error' as const,
        };
      case 'VERIFY':
        return {
          label: 'Verify',
          description: 'Verify document authenticity and add blue stamp',
          icon: <VerifiedIcon />,
          color: 'info' as const,
        };
      case 'UPLOAD':
        return {
          label: 'Upload Confirmation',
          description: 'Confirm document upload with gray stamp',
          icon: <UploadIcon />,
          color: 'inherit' as const,
        };
      default:
        return {
          label: type,
          description: 'Sign this document',
          icon: <DrawIcon />,
          color: 'inherit' as const,
        };
    }
  };

  const currentTypeInfo = getSignatureTypeInfo(signatureType);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        color={color}
        disabled={disabled}
        onClick={handleOpen}
        startIcon={showIcon ? <DrawIcon /> : undefined}
        fullWidth={fullWidth}
      >
        Sign Document
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Sign Document</Typography>
            <IconButton onClick={handleClose} disabled={loading} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Document Info */}
            {documentName && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Document
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {documentName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {documentId}
                </Typography>
              </Paper>
            )}

            {/* Signature Type Selection */}
            <FormControl fullWidth>
              <InputLabel id="signature-type-label">Signature Type</InputLabel>
              <Select
                labelId="signature-type-label"
                value={signatureType}
                label="Signature Type"
                onChange={(e) => setSignatureType(e.target.value as any)}
                disabled={loading || allowedTypes.length === 1}
              >
                {allowedTypes.map((type) => {
                  const typeInfo = getSignatureTypeInfo(type);
                  return (
                    <MenuItem key={type} value={type}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {typeInfo.icon}
                        <Typography>{typeInfo.label}</Typography>
                      </Stack>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Signature Type Info */}
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2">{currentTypeInfo.description}</Typography>
              {signatureType === 'APPROVE' && (
                <Typography variant="caption" display="block" mt={1}>
                  ✅ Visual signature stamp will be added to PDF with green checkmark
                </Typography>
              )}
              {signatureType === 'VERIFY' && (
                <Typography variant="caption" display="block" mt={1}>
                  🔍 Visual signature stamp will be added to PDF with blue verification badge
                </Typography>
              )}
              {signatureType === 'REJECT' && (
                <Typography variant="caption" display="block" mt={1}>
                  ❌ Visual signature stamp will be added to PDF with red rejection mark
                </Typography>
              )}
            </Alert>

            {/* Remarks */}
            <TextField
              label="Remarks (Optional)"
              multiline
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                signatureType === 'REJECT'
                  ? 'Please provide a reason for rejection...'
                  : 'Add any comments or notes...'
              }
              disabled={loading}
              fullWidth
              helperText={
                signatureType === 'REJECT'
                  ? 'Remarks are recommended for rejections'
                  : 'Optional comments about this signature'
              }
            />

            {/* Blockchain Info */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'blue.50' }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  🔐 Blockchain-Backed Signature
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block">
                Your signature will be cryptographically recorded on the blockchain using your X.509
                certificate, ensuring non-repudiation and complete audit trail.
              </Typography>
            </Paper>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                <Typography variant="body2" fontWeight="bold">
                  Document signed successfully!
                </Typography>
                <Typography variant="caption" display="block">
                  Signature recorded on blockchain and visual stamp added to PDF
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClose} disabled={loading} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={loading || success}
            variant="contained"
            color={currentTypeInfo.color}
            startIcon={loading ? <CircularProgress size={20} /> : currentTypeInfo.icon}
          >
            {loading ? 'Signing...' : `Sign as ${currentTypeInfo.label}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SignDocumentButton;
