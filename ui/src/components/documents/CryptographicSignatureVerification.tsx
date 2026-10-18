// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Cryptographic Signature Verification Component
// Displays cryptographic signature verification results with tamper detection

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Fingerprint as FingerprintIcon,
  QrCode as QrCodeIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';

interface SignatureVerificationProps {
  documentId: string;
  onVerificationComplete?: (result: any) => void;
}

interface VerificationResult {
  documentId: string;
  documentType: string;
  fileName: string;
  hasSignatures: boolean;
  signatureCount: number;
  cryptoSignatureCount: number;
  allSignaturesCryptographic: boolean;
  overallStatus: 'VERIFIED' | 'TAMPERED' | 'PARTIAL' | 'UNSIGNED' | 'UNVERIFIED';
  cryptographicVerification?: {
    isValid: boolean;
    isTampered: boolean;
    documentHash: string;
    verificationTimestamp: string;
    signatures: Array<{
      signerName: string;
      organization: string;
      signedAt: string;
      certificateValid: boolean;
      certificateIssuer: string;
      certificateSubject: string;
      blockchainTxId?: string;
      reason?: string;
    }>;
  };
  databaseSignatures: Array<{
    signatureId: string;
    signerName: string;
    organization: string;
    signatureType: string;
    signedAt: string;
    blockchainTxId: string;
    remarks?: string;
    cryptoSignatureEmbedded: boolean;
  }>;
  blockchainVerified?: boolean;
}

export const CryptographicSignatureVerification: React.FC<SignatureVerificationProps> = ({
  documentId,
  onVerificationComplete,
}) => {
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | false>('overview');

  useEffect(() => {
    verifySignatures();
  }, [documentId]);

  const verifySignatures = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/documents/${documentId}/verify-signatures`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setVerificationResult(response.data.data);
        onVerificationComplete?.(response.data.data);
      } else {
        setError('Failed to verify signatures');
      }
    } catch (err: any) {
      console.error('Signature verification error:', err);
      setError(err.response?.data?.error?.message || 'Failed to verify signatures');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'VERIFIED':
        return 'success';
      case 'TAMPERED':
        return 'error';
      case 'PARTIAL':
      case 'UNSIGNED':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <VerifiedIcon />;
      case 'TAMPERED':
        return <ErrorIcon />;
      case 'PARTIAL':
        return <WarningIcon />;
      case 'UNSIGNED':
        return <InfoIcon />;
      default:
        return <SecurityIcon />;
    }
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Verifying signatures...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Verification Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  if (!verificationResult) {
    return (
      <Alert severity="info">
        <AlertTitle>No Verification Data</AlertTitle>
        Unable to retrieve signature verification results.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Overall Status Banner */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 3,
          background:
            verificationResult.overallStatus === 'VERIFIED'
              ? 'linear-gradient(135deg, #00695c 0%, #00897b 100%)'
              : verificationResult.overallStatus === 'TAMPERED'
              ? 'linear-gradient(135deg, #c62828 0%, #e53935 100%)'
              : 'linear-gradient(135deg, #f57c00 0%, #fb8c00 100%)',
          color: 'white',
        }}
      >
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getStatusIcon(verificationResult.overallStatus)}
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="h5" fontWeight="bold">
              {verificationResult.overallStatus === 'VERIFIED' && '✓ Document Verified'}
              {verificationResult.overallStatus === 'TAMPERED' && '⚠ Document Tampered'}
              {verificationResult.overallStatus === 'PARTIAL' && '⚠ Partially Signed'}
              {verificationResult.overallStatus === 'UNSIGNED' && 'ℹ Document Unsigned'}
              {verificationResult.overallStatus === 'UNVERIFIED' && '? Verification Incomplete'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {verificationResult.fileName} ({verificationResult.documentType})
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={verifySignatures}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Re-verify
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tamper Warning */}
      {verificationResult.cryptographicVerification?.isTampered && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>⚠ DOCUMENT HAS BEEN TAMPERED WITH</AlertTitle>
          This document has been modified after it was signed. The cryptographic signature is invalid.
          <strong> DO NOT TRUST THIS DOCUMENT.</strong>
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {verificationResult.signatureCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Signatures
                  </Typography>
                </Box>
                <SecurityIcon fontSize="large" color="action" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {verificationResult.cryptoSignatureCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cryptographic
                  </Typography>
                </Box>
                <ShieldIcon fontSize="large" color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Chip
                    label={verificationResult.blockchainVerified ? 'YES' : 'NO'}
                    color={verificationResult.blockchainVerified ? 'success' : 'default'}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Blockchain Verified
                  </Typography>
                </Box>
                <FingerprintIcon fontSize="large" color={verificationResult.blockchainVerified ? 'success' : 'action'} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Chip
                    label={verificationResult.allSignaturesCryptographic ? 'FULL' : 'PARTIAL'}
                    color={verificationResult.allSignaturesCryptographic ? 'success' : 'warning'}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Coverage
                  </Typography>
                </Box>
                <VerifiedIcon
                  fontSize="large"
                  color={verificationResult.allSignaturesCryptographic ? 'success' : 'warning'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Information Accordions */}
      
      {/* Cryptographic Verification Details */}
      {verificationResult.cryptographicVerification && (
        <Accordion expanded={expanded === 'crypto'} onChange={handleAccordionChange('crypto')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" width="100%">
              <ShieldIcon sx={{ mr: 2 }} color="primary" />
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Cryptographic Verification
              </Typography>
              <Chip
                label={verificationResult.cryptographicVerification.isValid ? 'VALID' : 'INVALID'}
                color={verificationResult.cryptographicVerification.isValid ? 'success' : 'error'}
                size="small"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <ListItem>
                <ListItemIcon>
                  {verificationResult.cryptographicVerification.isValid ? (
                    <CheckIcon color="success" />
                  ) : (
                    <CancelIcon color="error" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Signature Validity"
                  secondary={
                    verificationResult.cryptographicVerification.isValid
                      ? 'All signatures are cryptographically valid'
                      : 'One or more signatures are invalid'
                  }
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  {verificationResult.cryptographicVerification.isTampered ? (
                    <ErrorIcon color="error" />
                  ) : (
                    <CheckIcon color="success" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Tamper Detection"
                  secondary={
                    verificationResult.cryptographicVerification.isTampered
                      ? 'Document has been modified after signing'
                      : 'Document integrity verified - no tampering detected'
                  }
                />
              </ListItem>

              <Divider sx={{ my: 2 }} />

              <ListItem>
                <ListItemIcon>
                  <FingerprintIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Document Hash"
                  secondary={
                    <Tooltip title={verificationResult.cryptographicVerification.documentHash}>
                      <Typography variant="body2" fontFamily="monospace" noWrap>
                        {verificationResult.cryptographicVerification.documentHash.substring(0, 32)}...
                      </Typography>
                    </Tooltip>
                  }
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Verification Timestamp"
                  secondary={new Date(
                    verificationResult.cryptographicVerification.verificationTimestamp
                  ).toLocaleString()}
                />
              </ListItem>

              {verificationResult.cryptographicVerification.signatures.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ px: 2, pb: 1 }}>
                    Embedded Signatures ({verificationResult.cryptographicVerification.signatures.length})
                  </Typography>
                  {verificationResult.cryptographicVerification.signatures.map((sig, index) => (
                    <Card key={index} variant="outlined" sx={{ m: 2, p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center">
                            <CheckIcon color="success" sx={{ mr: 1 }} />
                            <Typography variant="subtitle1" fontWeight="bold">
                              {sig.signerName}
                            </Typography>
                            <Chip label={sig.organization} size="small" sx={{ ml: 2 }} />
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Signed At
                          </Typography>
                          <Typography variant="body2">
                            {new Date(sig.signedAt).toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Certificate Status
                          </Typography>
                          <Typography variant="body2">
                            <Chip
                              label={sig.certificateValid ? 'VALID' : 'INVALID'}
                              color={sig.certificateValid ? 'success' : 'error'}
                              size="small"
                            />
                          </Typography>
                        </Grid>
                        {sig.blockchainTxId && (
                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Blockchain TX
                            </Typography>
                            <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                              {sig.blockchainTxId}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Card>
                  ))}
                </>
              )}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Database Signatures */}
      <Accordion expanded={expanded === 'database'} onChange={handleAccordionChange('database')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" width="100%">
            <SecurityIcon sx={{ mr: 2 }} color="primary" />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Signature Records ({verificationResult.databaseSignatures.length})
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {verificationResult.databaseSignatures.map((sig, index) => (
              <React.Fragment key={sig.signatureId}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemIcon>
                    {sig.cryptoSignatureEmbedded ? (
                      <VerifiedIcon color="success" />
                    ) : (
                      <WarningIcon color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {sig.signerName}
                        </Typography>
                        <Chip label={sig.organization} size="small" />
                        <Chip label={sig.signatureType} size="small" color="primary" />
                        {sig.cryptoSignatureEmbedded && (
                          <Chip label="CRYPTOGRAPHIC" size="small" color="success" icon={<ShieldIcon />} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" display="block">
                          Signed {formatDistanceToNow(new Date(sig.signedAt))} ago
                        </Typography>
                        {sig.blockchainTxId && (
                          <Typography variant="caption" display="block" fontFamily="monospace">
                            TX: {sig.blockchainTxId}
                          </Typography>
                        )}
                        {sig.remarks && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {sig.remarks}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default CryptographicSignatureVerification;
