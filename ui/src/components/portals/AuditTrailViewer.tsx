// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Audit Trail Viewer Component - View Cryptographic Signatures and Audit Logs

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Verified as VerifiedIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { api } from '../../utils/api';

interface AuditLog {
  logId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  signature: {
    transactionId: string;
    timestamp: string;
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
}

interface AuditTrailViewerProps {
  entityType: 'EXPORTER' | 'CONTRACT' | 'SHIPMENT' | 'LC' | 'PAYMENT';
  entityId: string;
  open: boolean;
  onClose: () => void;
}

const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({
  entityType,
  entityId,
  open,
  onClose,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (open) {
      fetchAuditLogs();
      verifyAuditTrail();
    }
  }, [open, entityType, entityId]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/audit/entity/${entityType}/${entityId}`);
      
      if (response.data.success) {
        setAuditLogs(response.data.data || []);
      } else {
        setError(response.data.error || 'Failed to fetch audit logs');
      }
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.response?.data?.error || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const verifyAuditTrail = async () => {
    try {
      const response = await api.get(`/audit/verify/${entityType}/${entityId}`);
      
      if (response.data.success) {
        setVerificationStatus(response.data);
      }
    } catch (err) {
      console.error('Error verifying audit trail:', err);
    }
  };

  const downloadComplianceReport = async () => {
    try {
      const response = await api.get(`/audit/compliance-report/${entityType}/${entityId}`);
      
      if (response.data.success) {
        // Create downloadable JSON file
        const dataStr = JSON.stringify(response.data.report, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `compliance-report-${entityType}-${entityId}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } catch (err) {
      console.error('Error downloading compliance report:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (actionType: string) => {
    const colors: { [key: string]: any } = {
      CREATE: 'primary',
      UPDATE: 'info',
      APPROVE: 'success',
      REJECT: 'error',
      SUSPEND: 'warning',
      REVOKE: 'error',
      SUBMIT: 'info',
      VERIFY: 'success',
      SETTLE: 'success',
    };
    return colors[actionType] || 'default';
  };

  const renderTimelineView = () => (
    <Box sx={{ mt: 2 }}>
      {auditLogs.map((log, index) => (
        <Box
          key={log.logId}
          sx={{
            position: 'relative',
            pl: 4,
            pb: 3,
            borderLeft: index < auditLogs.length - 1 ? '2px solid #e0e0e0' : 'none',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: -10,
              top: 0,
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: getActionColor(log.actionType) === 'success' ? '#4caf50' : '#2196f3',
              border: '3px solid white',
            }}
          />
          
          <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {log.actionType}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTimestamp(log.signature.timestamp)}
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              by {log.signature.caller.commonName} ({log.signature.caller.mspId})
            </Typography>
            
            {log.statusBefore && log.statusAfter && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Status: <strong>{log.statusBefore}</strong> → <strong>{log.statusAfter}</strong>
              </Typography>
            )}
            
            {log.reason && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                Reason: {log.reason}
              </Typography>
            )}
            
            <Box sx={{ mt: 1 }}>
              <Tooltip title="Copy Transaction ID">
                <IconButton size="small" onClick={() => copyToClipboard(log.signature.transactionId)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption" sx={{ ml: 1 }}>
                TX: {log.signature.transactionId.substring(0, 16)}...
              </Typography>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );

  const renderDetailedView = () => (
    <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 500 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Timestamp</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Actor</TableCell>
            <TableCell>Status Change</TableCell>
            <TableCell>Transaction ID</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {auditLogs.map((log) => (
            <TableRow key={log.logId} hover>
              <TableCell>{formatTimestamp(log.signature.timestamp)}</TableCell>
              <TableCell>
                <Chip
                  label={log.actionType}
                  color={getActionColor(log.actionType)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">{log.signature.caller.commonName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {log.signature.caller.role}
                </Typography>
              </TableCell>
              <TableCell>
                {log.statusBefore} → {log.statusAfter}
              </TableCell>
              <TableCell>
                <Tooltip title="Copy Transaction ID">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(log.signature.transactionId)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Typography variant="caption">
                  {log.signature.transactionId.substring(0, 12)}...
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCryptographicDetails = () => (
    <Box sx={{ mt: 2 }}>
      {auditLogs.map((log) => (
        <Accordion key={log.logId}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <SecurityIcon color="primary" />
              <Typography>
                {log.actionType} - {formatTimestamp(log.signature.timestamp)}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Transaction Signature */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Transaction Signature
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="caption" component="div">
                    <strong>Transaction ID:</strong> {log.signature.transactionId}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Data Hash (SHA-256):</strong> {log.signature.dataHash}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Previous State Hash:</strong> {log.signature.previousStateHash || 'N/A'}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>New State Hash:</strong> {log.signature.newStateHash}
                  </Typography>
                </Paper>
              </Box>

              {/* Identity */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Cryptographic Identity
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="caption" component="div">
                    <strong>MSP ID:</strong> {log.signature.caller.mspId}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Common Name:</strong> {log.signature.caller.commonName}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Role:</strong> {log.signature.caller.role}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Certificate Hash:</strong> {log.signature.caller.certificateHash}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Organization Unit:</strong> {log.signature.caller.organizationUnit}
                  </Typography>
                </Paper>
              </Box>

              {/* Endorsement */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Endorsement
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="caption" component="div">
                    <strong>Endorsing Peers:</strong>{' '}
                    {log.signature.endorsingPeers?.join(', ') || 'N/A'}
                  </Typography>
                </Paper>
              </Box>

              {/* Compliance */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Compliance Status
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {log.complianceData.ectaCompliance && (
                      <Chip label="ECTA ✓" color="success" size="small" />
                    )}
                    {log.complianceData.nbeCompliance && (
                      <Chip label="NBE ✓" color="success" size="small" />
                    )}
                    {log.complianceData.ucp600Check && (
                      <Chip label="UCP 600 ✓" color="success" size="small" />
                    )}
                    {log.complianceData.eudrCompliance && (
                      <Chip label="EUDR ✓" color="success" size="small" />
                    )}
                    {log.complianceData.icoCompliance && (
                      <Chip label="ICO ✓" color="success" size="small" />
                    )}
                  </Box>
                  {log.complianceData.complianceNote && (
                    <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                      {log.complianceData.complianceNote}
                    </Typography>
                  )}
                </Paper>
              </Box>

              {/* Field Changes */}
              {log.changes && log.changes.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Field Changes
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Field</TableCell>
                          <TableCell>Old Value</TableCell>
                          <TableCell>New Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {log.changes.map((change, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{change.fieldName}</TableCell>
                            <TableCell>{change.oldValue || '—'}</TableCell>
                            <TableCell>{change.newValue}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimelineIcon />
            <Typography variant="h6">
              Audit Trail - {entityType} {entityId}
            </Typography>
          </Box>
          <Tooltip title="Download Compliance Report">
            <IconButton onClick={downloadComplianceReport} color="primary">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Verification Status */}
        {verificationStatus && (
          <Alert
            severity={verificationStatus.verified ? 'success' : 'error'}
            icon={<VerifiedIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle2">
              {verificationStatus.verified
                ? '✅ Audit Trail Verified - Hash chain integrity confirmed'
                : '❌ Audit Trail Verification Failed - Possible tampering detected'}
            </Typography>
            <Typography variant="caption">{verificationStatus.message}</Typography>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        {!loading && !error && auditLogs.length > 0 && (
          <>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab icon={<TimelineIcon />} label="Timeline" />
              <Tab icon={<AssessmentIcon />} label="Details" />
              <Tab icon={<SecurityIcon />} label="Cryptographic" />
            </Tabs>

            {activeTab === 0 && renderTimelineView()}
            {activeTab === 1 && renderDetailedView()}
            {activeTab === 2 && renderCryptographicDetails()}
          </>
        )}

        {/* Empty State */}
        {!loading && !error && auditLogs.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No audit logs found for this entity
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuditTrailViewer;
