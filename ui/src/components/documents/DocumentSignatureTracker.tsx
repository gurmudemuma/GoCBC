/**
 * DocumentSignatureTracker Component
 * Displays blockchain-backed signature timeline for documents with visual verification
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Stack,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Verified as VerifiedIcon,
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  AccountCircle as AccountCircleIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Fingerprint as FingerprintIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface Signature {
  signature_id: string;
  document_id: string;
  signer_id: string;
  signer_org: string;
  signature_type: 'UPLOAD' | 'VERIFY' | 'APPROVE' | 'REJECT';
  certificate_id?: string;
  remarks?: string;
  blockchain_tx_id?: string;
  visual_signature_added: boolean;
  signed_at: string;
}

interface SignatureData {
  documentId: string;
  fileName: string;
  status: string;
  signatures: Signature[];
  signatureCount: number;
  latestSignature: Signature | null;
}

interface DocumentSignatureTrackerProps {
  documentId: string;
  showHeader?: boolean;
  compact?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const DocumentSignatureTracker: React.FC<DocumentSignatureTrackerProps> = ({
  documentId,
  showHeader = true,
  compact = false,
  autoRefresh = false,
  refreshInterval = 30000,
}) => {
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | false>(false);

  const fetchSignatures = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3001/api/v1/documents/${documentId}/signatures`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSignatureData(response.data.data);
      } else {
        setError('Failed to fetch signatures');
      }
    } catch (err: any) {
      console.error('Error fetching signatures:', err);
      setError(err.response?.data?.error?.message || 'Failed to load signatures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignatures();

    // Auto-refresh if enabled
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchSignatures, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [documentId, autoRefresh, refreshInterval]);

  const getSignatureIcon = (type: string) => {
    switch (type) {
      case 'APPROVE':
        return <CheckCircleIcon />;
      case 'REJECT':
        return <CancelIcon />;
      case 'VERIFY':
        return <VerifiedIcon />;
      case 'UPLOAD':
        return <UploadIcon />;
      default:
        return <ShieldIcon />;
    }
  };

  const getSignatureColor = (type: string): 'success' | 'error' | 'info' | 'grey' => {
    switch (type) {
      case 'APPROVE':
        return 'success';
      case 'REJECT':
        return 'error';
      case 'VERIFY':
        return 'info';
      case 'UPLOAD':
        return 'grey';
      default:
        return 'grey';
    }
  };

  const getChipColor = (type: string): 'success' | 'error' | 'info' | 'default' => {
    switch (type) {
      case 'APPROVE':
        return 'success';
      case 'REJECT':
        return 'error';
      case 'VERIFY':
        return 'info';
      case 'UPLOAD':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!signatureData) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No signature data available
      </Alert>
    );
  }

  if (signatureData.signatures.length === 0) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <Typography variant="body2">
          No signatures found for this document. Document has not been signed yet.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {showHeader && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6" gutterBottom>
                  📝 Document Signatures
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {signatureData.fileName}
                </Typography>
              </Box>
              <Box textAlign="right">
                <Chip
                  label={`${signatureData.signatureCount} Signature${signatureData.signatureCount !== 1 ? 's' : ''}`}
                  color="primary"
                  variant="outlined"
                  size={compact ? 'small' : 'medium'}
                />
                <Typography variant="caption" display="block" color="text.secondary" mt={1}>
                  Status: {signatureData.status}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Paper elevation={2} sx={{ p: compact ? 2 : 3 }}>
        <Timeline position={compact ? 'right' : 'alternate'}>
          {signatureData.signatures.map((signature, index) => (
            <TimelineItem key={signature.signature_id}>
              {!compact && (
                <TimelineOppositeContent color="text.secondary">
                  <Typography variant="body2" fontWeight="bold">
                    {formatDate(signature.signed_at)}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {new Date(signature.signed_at).toLocaleTimeString()}
                  </Typography>
                </TimelineOppositeContent>
              )}

              <TimelineSeparator>
                <TimelineDot color={getSignatureColor(signature.signature_type)}>
                  {getSignatureIcon(signature.signature_type)}
                </TimelineDot>
                {index < signatureData.signatures.length - 1 && <TimelineConnector />}
              </TimelineSeparator>

              <TimelineContent>
                <Accordion
                  expanded={expanded === signature.signature_id}
                  onChange={handleAccordionChange(signature.signature_id)}
                  elevation={1}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={2} alignItems="center" width="100%">
                      <Avatar sx={{ bgcolor: `${getSignatureColor(signature.signature_type)}.light` }}>
                        {signature.signer_id.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {signature.signature_type}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          by {signature.signer_id}
                        </Typography>
                      </Box>
                      {signature.visual_signature_added && (
                        <Tooltip title="Visual signature stamp added to PDF">
                          <Chip
                            icon={<VisibilityIcon />}
                            label="Visual"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                    </Stack>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Stack spacing={2}>
                      {compact && (
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(signature.signed_at)}
                            </Typography>
                          </Stack>
                        </Box>
                      )}

                      <Divider />

                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <AccountCircleIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight="bold">
                            Signer Details
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" pl={4}>
                          User: {signature.signer_id}
                        </Typography>
                      </Box>

                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <BusinessIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight="bold">
                            Organization
                          </Typography>
                        </Stack>
                        <Chip
                          label={signature.signer_org}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 4 }}
                        />
                      </Box>

                      {signature.certificate_id && (
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <FingerprintIcon fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight="bold">
                              Certificate ID
                            </Typography>
                          </Stack>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              pl: 4,
                              wordBreak: 'break-all',
                              fontFamily: 'monospace',
                              display: 'block',
                            }}
                          >
                            {signature.certificate_id}
                          </Typography>
                        </Box>
                      )}

                      {signature.blockchain_tx_id && (
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <LinkIcon fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight="bold">
                              Blockchain Transaction
                            </Typography>
                          </Stack>
                          <Typography
                            variant="caption"
                            color="primary"
                            sx={{
                              pl: 4,
                              wordBreak: 'break-all',
                              fontFamily: 'monospace',
                              display: 'block',
                            }}
                          >
                            {signature.blockchain_tx_id}
                          </Typography>
                        </Box>
                      )}

                      {signature.remarks && (
                        <Box>
                          <Typography variant="body2" fontWeight="bold" mb={1}>
                            Remarks
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                            <Typography variant="body2" color="text.secondary">
                              {signature.remarks}
                            </Typography>
                          </Paper>
                        </Box>
                      )}

                      <Divider />

                      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Signature ID: {signature.signature_id.substring(0, 20)}...
                        </Typography>
                        {signature.visual_signature_added ? (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="PDF Stamped"
                            size="small"
                            color="success"
                          />
                        ) : (
                          <Chip label="No Visual Stamp" size="small" variant="outlined" />
                        )}
                      </Stack>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>

        {signatureData.latestSignature && (
          <Box mt={3} p={2} bgcolor="grey.50" borderRadius={2}>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              ✅ Latest Signature
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Chip
                label={signatureData.latestSignature.signature_type}
                color={getChipColor(signatureData.latestSignature.signature_type)}
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                by {signatureData.latestSignature.signer_id}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({signatureData.latestSignature.signer_org})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                on {formatDate(signatureData.latestSignature.signed_at)}
              </Typography>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DocumentSignatureTracker;
