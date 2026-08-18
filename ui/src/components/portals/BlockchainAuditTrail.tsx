// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// TRUE Blockchain Audit Trail Component - Shows Immutable Blockchain Audit Chain

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ExpandMore,
  Link as LinkIcon,
  VerifiedUser,
  Lock,
  Fingerprint,
  AccountTree,
  CheckCircle,
  Error,
  Info,
  Refresh,
  Search,
} from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';

interface BlockchainAuditLog {
  logId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  signature: {
    transactionId: string;
    channelId: string;
    timestamp: string;
    functionName: string;
    caller: {
      mspId: string;
      commonName: string;
      certificateHash: string;
      role: string;
      organizationUnit: string;
    };
    dataHash: string;
    previousStateHash: string;
    newStateHash: string;
    endorsingPeers: string[];
  };
  statusBefore: string;
  statusAfter: string;
  changes: Array<{
    fieldName: string;
    oldValue: string;
    newValue: string;
    dataType: string;
  }>;
  reason: string;
  complianceData: {
    ectaCompliance: boolean;
    nbeCompliance: boolean;
    ucp600Check: boolean;
    eudrCompliance: boolean;
    icoCompliance: boolean;
    complianceNote: string;
  };
  createdAt: string;
  chainPosition?: number;
  totalInChain?: number;
  chainVerified?: boolean;
  isBlockchainRecord?: boolean;
  immutable?: boolean;
}

interface ChainVerification {
  verified: boolean;
  message: string;
  totalLogs: number;
  brokenLinks: any[];
  chainDetails: any[];
}

interface BlockchainAuditTrailProps {
  entityType: string;
  entityId: string;
  title?: string;
}

const BlockchainAuditTrail: React.FC<BlockchainAuditTrailProps> = ({
  entityType,
  entityId,
  title = 'Blockchain Audit Trail',
}) => {
  const [logs, setLogs] = useState<BlockchainAuditLog[]>([]);
  const [verification, setVerification] = useState<ChainVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<BlockchainAuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchBlockchainAuditTrail = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch(
        `/audit/blockchain/${entityType}/${entityId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs || []);
        setVerification(result.data.verification || null);
      } else {
        setError(result.error || 'Failed to fetch blockchain audit trail');
      }
    } catch (err: any) {
      console.error('Error fetching blockchain audit trail:', err);
      setError('Failed to load blockchain audit trail. Blockchain may not be connected.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityType && entityId) {
      fetchBlockchainAuditTrail();
    }
  }, [entityType, entityId]);

  const handleOpenDetails = (log: BlockchainAuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedLog(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (
    action: string
  ): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (action.toUpperCase()) {
      case 'CREATE':
      case 'REGISTER':
      case 'APPROVE':
        return 'success';
      case 'DELETE':
      case 'REJECT':
      case 'SUSPEND':
        return 'error';
      case 'UPDATE':
      case 'EDIT':
        return 'warning';
      default:
        return 'info';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (logs.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No blockchain audit logs found for this entity. Logs are created when transactions are recorded on the blockchain.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock color="primary" />
          {title}
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={fetchBlockchainAuditTrail}
          disabled={loading}
          variant="outlined"
          size="small"
        >
          Refresh
        </Button>
      </Box>

      {/* Verification Summary */}
      {verification && (
        <Card sx={{ mb: 3, bgcolor: verification.verified ? 'success.50' : 'error.50' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {verification.verified ? (
                <CheckCircle color="success" fontSize="large" />
              ) : (
                <Error color="error" fontSize="large" />
              )}
              <Box>
                <Typography variant="h6">
                  Cryptographic Chain Verification
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {verification.message}
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Total Logs
                </Typography>
                <Typography variant="h6">{verification.totalLogs}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Broken Links
                </Typography>
                <Typography variant="h6" color={verification.brokenLinks.length > 0 ? 'error' : 'success'}>
                  {verification.brokenLinks.length}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Chain Status
                </Typography>
                <Chip
                  label={verification.verified ? 'INTACT' : 'BROKEN'}
                  color={verification.verified ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Audit Chain Timeline */}
      <Box>
        {logs.map((log, index) => (
          <Box key={log.logId} sx={{ position: 'relative', mb: 3 }}>
            {/* Chain Link Line */}
            {index < logs.length - 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 24,
                  top: 80,
                  bottom: -24,
                  width: 2,
                  bgcolor: log.chainVerified ? 'success.main' : 'error.main',
                  zIndex: 0,
                }}
              />
            )}

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                  }}
                >
                  {/* Position Badge */}
                  <Box
                    sx={{
                      minWidth: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: getActionColor(log.actionType) + '.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      zIndex: 1,
                    }}
                  >
                    {log.chainPosition || index + 1}
                  </Box>

                  {/* Log Summary */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={log.actionType}
                        size="small"
                        color={getActionColor(log.actionType)}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(log.createdAt)}
                      </Typography>
                      {log.immutable && (
                        <Chip
                          icon={<Lock />}
                          label="IMMUTABLE"
                          size="small"
                          color="primary"
                        />
                      )}
                      {log.chainVerified && (
                        <Chip
                          icon={<CheckCircle />}
                          label="VERIFIED"
                          size="small"
                          color="success"
                        />
                      )}
                    </Box>
                    <Typography variant="body2">
                      {log.statusBefore} → {log.statusAfter}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      By: {log.signature.caller.commonName} ({log.signature.caller.mspId})
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Box sx={{ pl: 8 }}>
                  {/* Transaction Details */}
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Fingerprint fontSize="small" />
                        Transaction Signature
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Transaction ID
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {log.signature.transactionId}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Channel
                          </Typography>
                          <Typography variant="body2">{log.signature.channelId}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Function
                          </Typography>
                          <Typography variant="body2">{log.signature.functionName}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Cryptographic Hashes */}
                  <Card variant="outlined" sx={{ mb: 2, bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountTree fontSize="small" />
                        Cryptographic Chain (SHA-256)
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Previous State Hash
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            {log.signature.previousStateHash}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <LinkIcon color="primary" />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Data Hash
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            {log.signature.dataHash}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <LinkIcon color="primary" />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            New State Hash
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            {log.signature.newStateHash}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Identity */}
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VerifiedUser fontSize="small" />
                        Identity Verification
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Organization (MSP)
                          </Typography>
                          <Typography variant="body2">{log.signature.caller.mspId}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Common Name
                          </Typography>
                          <Typography variant="body2">{log.signature.caller.commonName}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Role
                          </Typography>
                          <Typography variant="body2">{log.signature.caller.role}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Organizational Unit
                          </Typography>
                          <Typography variant="body2">{log.signature.caller.organizationUnit}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Certificate Hash (SHA-256)
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            {log.signature.caller.certificateHash}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Endorsements */}
                  {log.signature.endorsingPeers && log.signature.endorsingPeers.length > 0 && (
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Multi-Organization Endorsements
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {log.signature.endorsingPeers.map((peer, idx) => (
                            <Chip
                              key={idx}
                              label={peer}
                              icon={<CheckCircle />}
                              color="success"
                              size="small"
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                  {/* Field Changes */}
                  {log.changes && log.changes.length > 0 && (
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Field Changes
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        {log.changes.map((change, idx) => (
                          <Box key={idx} sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {change.fieldName}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={change.oldValue} size="small" variant="outlined" />
                              <Typography variant="body2">→</Typography>
                              <Chip label={change.newValue} size="small" color="primary" />
                            </Box>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Compliance */}
                  {log.complianceData && (
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Compliance Verification
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Chip
                              label="ECTA"
                              color={log.complianceData.ectaCompliance ? 'success' : 'default'}
                              size="small"
                              icon={log.complianceData.ectaCompliance ? <CheckCircle /> : undefined}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <Chip
                              label="NBE"
                              color={log.complianceData.nbeCompliance ? 'success' : 'default'}
                              size="small"
                              icon={log.complianceData.nbeCompliance ? <CheckCircle /> : undefined}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <Chip
                              label="UCP600"
                              color={log.complianceData.ucp600Check ? 'success' : 'default'}
                              size="small"
                              icon={log.complianceData.ucp600Check ? <CheckCircle /> : undefined}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <Chip
                              label="EUDR"
                              color={log.complianceData.eudrCompliance ? 'success' : 'default'}
                              size="small"
                              icon={log.complianceData.eudrCompliance ? <CheckCircle /> : undefined}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              {log.complianceData.complianceNote}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  )}

                  {log.reason && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        Reason:
                      </Typography>
                      <Typography variant="body2">{log.reason}</Typography>
                    </Alert>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default BlockchainAuditTrail;
