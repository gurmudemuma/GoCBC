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
import api from '../../utils/api';

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
  entityType: 'EXPORTER' | 'CONTRACT' | 'SHIPMENT' | 'LC' | 'PAYMENT' | 'LOT' | 'FOREX' | 'PERMIT' | 'DECLARATION' | 'INSPECTION' | 'BOOKING' | 'CONTAINER' | 'QUALITY';
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
  
  // Feature flag - set to true when audit API endpoints are implemented
  const AUDIT_API_ENABLED = true;

  useEffect(() => {
    if (open && AUDIT_API_ENABLED) {
      fetchAuditLogs();
      verifyAuditTrail();
    } else if (open && !AUDIT_API_ENABLED) {
      // Show friendly message that feature is coming soon
      setError('Audit trail feature is currently under development. Check back soon!');
      setLoading(false);
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
      // Gracefully handle 404 - audit endpoints not yet implemented
      if (err.response?.status === 404) {
        console.log('[AUDIT] Audit trail endpoints not yet implemented');
        setError('Audit trail feature coming soon');
        setAuditLogs([]);
      } else {
        console.error('Error fetching audit logs:', err);
        setError(err.response?.data?.error || 'Failed to fetch audit logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyAuditTrail = async () => {
    try {
      const response = await api.get(`/audit/verify/${entityType}/${entityId}`);
      
      if (response.data.success && response.data.data) {
        // Extract the verification data from the nested structure
        setVerificationStatus({
          verified: response.data.data.verified,
          message: response.data.message || 'Verification complete',
          ...response.data.data
        });
      }
    } catch (err: any) {
      // Gracefully handle 404 - audit endpoints not yet implemented
      if (err.response?.status === 404) {
        console.log('[AUDIT] Audit verification endpoints not yet implemented');
        setVerificationStatus(null);
      } else {
        console.error('Error verifying audit trail:', err);
      }
    }
  };

  const downloadComplianceReport = async () => {
    try {
      const response = await api.get(`/audit/compliance-report/${entityType}/${entityId}`);
      
      if (response.data.success) {
        const report = response.data.report;
        
        // Create a comprehensive formatted text report
        const formattedReport = `
═══════════════════════════════════════════════════════════════════════════
            ETHIOPIAN COFFEE EXPORT CONSORTIUM BLOCKCHAIN SYSTEM
                   COMPREHENSIVE COMPLIANCE AUDIT REPORT
═══════════════════════════════════════════════════════════════════════════

Report Generated: ${new Date(report.reportGeneratedAt).toLocaleString()}
Entity Type: ${report.entityType}
Entity ID: ${report.entityId}

───────────────────────────────────────────────────────────────────────────
CURRENT ENTITY STATE
───────────────────────────────────────────────────────────────────────────

${report.currentState ? Object.entries(report.currentState).map(([key, value]) => 
  `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
).join('\n') : 'No current state data available'}

───────────────────────────────────────────────────────────────────────────
OVERALL STATISTICS
───────────────────────────────────────────────────────────────────────────

Total Blockchain Transactions: ${report.summary?.totalTransactions || 0}
Total Export Value: $${(report.summary?.exportValue || 0).toLocaleString()}
Total Shipment Weight: ${(report.summary?.shipmentWeight || 0).toLocaleString()} kg

───────────────────────────────────────────────────────────────────────────
AUDIT TRAIL SUMMARY
───────────────────────────────────────────────────────────────────────────

Total Actions: ${report.auditTrail?.totalActions || 0}

Compliance Status:
  ✓ ECTA Compliance:  ${report.auditTrail?.complianceSummary?.ectaCompliance || 0} actions compliant
  ○ NBE Compliance:   ${report.auditTrail?.complianceSummary?.nbeCompliance || 0} actions compliant
  ○ UCP600:           ${report.auditTrail?.complianceSummary?.ucp600Compliance || 0} actions compliant
  ○ EUDR:             ${report.auditTrail?.complianceSummary?.eudrCompliance || 0} actions compliant
  ○ ICO:              ${report.auditTrail?.complianceSummary?.icoCompliance || 0} actions compliant

Actions by Type:
${Object.entries(report.auditTrail?.actionsByType || {}).map(([action, count]) => 
  `  ${action}: ${count}`
).join('\n') || '  No actions recorded'}

Actor Summary:
${Object.entries(report.auditTrail?.actorSummary || {}).map(([actor, count]) => 
  `  ${actor}: ${count} action(s)`
).join('\n') || '  No actors recorded'}

───────────────────────────────────────────────────────────────────────────
BUSINESS HISTORY - CONTRACTS
───────────────────────────────────────────────────────────────────────────

Total Contracts: ${report.businessHistory?.contracts?.total || 0}
Active: ${report.businessHistory?.contracts?.active || 0}
Completed: ${report.businessHistory?.contracts?.completed || 0}

${report.businessHistory?.contracts?.details?.length > 0 ? 
  report.businessHistory.contracts.details.map((c: any, i: number) => `
Contract #${i + 1}:
  ID: ${c.contractId || c.ContractId}
  NBE Reference: ${c.nbeReferenceNumber || c.NbeReferenceNumber || 'N/A'}
  Buyer: ${c.buyerName || c.BuyerName} (${c.buyerCountry || c.BuyerCountry})
  Value: $${(parseFloat(c.contractValue || c.ContractValue || '0')).toLocaleString()}
  Quantity: ${c.quantity || c.Quantity} kg
  Status: ${c.status || c.Status}
  Created: ${c.createdAt || c.CreatedAt || 'N/A'}
`).join('\n' + '─'.repeat(75) + '\n') : '  No contracts found'}

───────────────────────────────────────────────────────────────────────────
BUSINESS HISTORY - SHIPMENTS
───────────────────────────────────────────────────────────────────────────

Total Shipments: ${report.businessHistory?.shipments?.total || 0}
In Transit: ${report.businessHistory?.shipments?.inTransit || 0}
Delivered: ${report.businessHistory?.shipments?.delivered || 0}

${report.businessHistory?.shipments?.details?.length > 0 ?
  report.businessHistory.shipments.details.map((s: any, i: number) => `
Shipment #${i + 1}:
  ID: ${s.shipmentId || s.ShipmentId}
  Contract: ${s.contractId || s.ContractId}
  ECX Lot: ${s.ecxLotNumber || s.EcxLotNumber || 'N/A'}
  Quantity: ${s.quantity || s.Quantity} kg
  Origin: ${s.origin || s.Origin}
  Port of Loading: ${s.portOfLoading || s.PortOfLoading || 'N/A'}
  Port of Discharge: ${s.portOfDischarge || s.PortOfDischarge || 'N/A'}
  Status: ${s.status || s.Status}
  Shipped: ${s.shippedDate || s.ShippedDate || 'N/A'}
`).join('\n' + '─'.repeat(75) + '\n') : '  No shipments found'}

───────────────────────────────────────────────────────────────────────────
BUSINESS HISTORY - LETTERS OF CREDIT
───────────────────────────────────────────────────────────────────────────

Total LCs: ${report.businessHistory?.letterOfCredit?.total || 0}
Issued: ${report.businessHistory?.letterOfCredit?.issued || 0}
Utilized: ${report.businessHistory?.letterOfCredit?.utilized || 0}

${report.businessHistory?.letterOfCredit?.details?.length > 0 ?
  report.businessHistory.letterOfCredit.details.map((lc: any, i: number) => `
LC #${i + 1}:
  ID: ${lc.lcId || lc.LcId}
  Contract: ${lc.contractId || lc.ContractId}
  Amount: $${(parseFloat(lc.amount || lc.Amount || '0')).toLocaleString()}
  Issuing Bank: ${lc.issuingBank || lc.IssuingBank}
  Advising Bank: ${lc.advisingBank || lc.AdvisingBank || 'N/A'}
  Status: ${lc.status || lc.Status}
  Issued: ${lc.issuedDate || lc.IssuedDate || 'N/A'}
  Expiry: ${lc.expiryDate || lc.ExpiryDate || 'N/A'}
`).join('\n' + '─'.repeat(75) + '\n') : '  No LCs found'}

───────────────────────────────────────────────────────────────────────────
BUSINESS HISTORY - PAYMENTS
───────────────────────────────────────────────────────────────────────────

Total Payments: ${report.businessHistory?.payments?.total || 0}
Completed: ${report.businessHistory?.payments?.completed || 0}
Total Amount: $${(report.businessHistory?.payments?.totalAmount || 0).toLocaleString()}

${report.businessHistory?.payments?.details?.length > 0 ?
  report.businessHistory.payments.details.map((p: any, i: number) => `
Payment #${i + 1}:
  ID: ${p.paymentId || p.PaymentId}
  LC: ${p.lcId || p.LcId}
  Amount: $${(parseFloat(p.amount || p.Amount || '0')).toLocaleString()}
  Currency: ${p.currency || p.Currency}
  Status: ${p.status || p.Status}
  Date: ${p.paymentDate || p.PaymentDate || 'N/A'}
`).join('\n' + '─'.repeat(75) + '\n') : '  No payments found'}

───────────────────────────────────────────────────────────────────────────
BUSINESS HISTORY - FOREX ALLOCATIONS
───────────────────────────────────────────────────────────────────────────

Total Forex: ${report.businessHistory?.forexAllocations?.total || 0}
Allocated: ${report.businessHistory?.forexAllocations?.allocated || 0}
Total Allocated: $${(report.businessHistory?.forexAllocations?.totalAllocated || 0).toLocaleString()}

${report.businessHistory?.forexAllocations?.details?.length > 0 ?
  report.businessHistory.forexAllocations.details.map((f: any, i: number) => `
Forex #${i + 1}:
  ID: ${f.forexId || f.ForexId}
  Contract: ${f.contractId || f.ContractId}
  Amount: $${(parseFloat(f.allocatedAmount || f.AllocatedAmount || '0')).toLocaleString()}
  Exchange Rate: ${f.exchangeRate || f.ExchangeRate} ETB/USD
  Status: ${f.status || f.Status}
  Allocated: ${f.allocationDate || f.AllocationDate || 'N/A'}
`).join('\n' + '─'.repeat(75) + '\n') : '  No forex allocations found'}

───────────────────────────────────────────────────────────────────────────
BUSINESS HISTORY - QUALITY INSPECTIONS
───────────────────────────────────────────────────────────────────────────

Total Inspections: ${report.businessHistory?.qualityInspections?.total || 0}
Approved: ${report.businessHistory?.qualityInspections?.approved || 0}
Rejected: ${report.businessHistory?.qualityInspections?.rejected || 0}

${report.businessHistory?.qualityInspections?.details?.length > 0 ?
  report.businessHistory.qualityInspections.details.map((q: any, i: number) => `
Inspection #${i + 1}:
  ID: ${q.inspectionId || q.InspectionId}
  Shipment: ${q.shipmentId || q.ShipmentId}
  Grade: ${q.gradeAssessed || q.GradeAssessed}
  Result: ${q.result || q.Result}
  Inspector: ${q.inspectorId || q.InspectorId}
  Date: ${q.inspectionDate || q.InspectionDate || 'N/A'}
`).join('\n' + '─'.repeat(75) + '\n') : '  No quality inspections found'}

───────────────────────────────────────────────────────────────────────────
BUSINESS HISTORY - PERMITS & CERTIFICATES
───────────────────────────────────────────────────────────────────────────

Export Permits: ${report.businessHistory?.permits?.total || 0} (Active: ${report.businessHistory?.permits?.active || 0})
Insurance Certificates: ${report.businessHistory?.insurance?.total || 0} (Active: ${report.businessHistory?.insurance?.active || 0})
Phytosanitary Certificates: ${report.businessHistory?.phytosanitary?.total || 0} (Active: ${report.businessHistory?.phytosanitary?.active || 0})
Customs Declarations: ${report.businessHistory?.customs?.total || 0} (Cleared: ${report.businessHistory?.customs?.cleared || 0})

───────────────────────────────────────────────────────────────────────────
DETAILED AUDIT LOGS
───────────────────────────────────────────────────────────────────────────

${report.auditTrail?.detailedLogs?.length > 0 ? report.auditTrail.detailedLogs.map((log: any, index: number) => `
[${index + 1}] ${log.actionType} - ${new Date(log.createdAt).toLocaleString()}
    Transaction ID: ${log.signature.transactionId}
    Actor: ${log.signature.caller.commonName} (${log.signature.caller.mspId})
    Status Change: ${log.statusBefore || 'N/A'} → ${log.statusAfter}
    Reason: ${log.reason}
    
    Compliance:
      • ECTA: ${log.complianceData.ectaCompliance ? '✓ Pass' : '✗ Fail'}
      • NBE: ${log.complianceData.nbeCompliance ? '✓ Pass' : '✗ Fail'}
      • UCP600: ${log.complianceData.ucp600Check ? '✓ Pass' : '✗ Fail'}
      • EUDR: ${log.complianceData.eudrCompliance ? '✓ Pass' : '✗ Fail'}
      • ICO: ${log.complianceData.icoCompliance ? '✓ Pass' : '✗ Fail'}
    Note: ${log.complianceData.complianceNote}
    
    Changes:
${log.changes.map((change: any) => 
  `      • ${change.fieldName}: "${change.oldValue || 'N/A'}" → "${change.newValue}"`
).join('\n')}
    
    Blockchain Verification:
      • Data Hash: ${log.signature.dataHash}
      • Endorsing Peers: ${log.signature.endorsingPeers.join(', ')}
      • Channel: ${log.signature.channelId}
`).join('\n' + '─'.repeat(75) + '\n') : '  No audit logs found'}

═══════════════════════════════════════════════════════════════════════════
                              END OF REPORT
═══════════════════════════════════════════════════════════════════════════

This comprehensive report includes ALL historical blockchain data for ${entityType} ${entityId}.
All transactions are cryptographically verified and immutable.

Ethiopian Coffee & Tea Authority (ECTA)
National Bank of Ethiopia (NBE)
Ethiopian Commodity Exchange (ECX)
Ethiopian Customs Commission (ECC)
`;

        // Create downloadable text file
        const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(formattedReport);
        const exportFileDefaultName = `CECBS-Complete-Report-${entityType}-${entityId}-${new Date().toISOString().split('T')[0]}.txt`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } catch (err: any) {
      // Gracefully handle 404 - audit endpoints not yet implemented
      if (err.response?.status === 404) {
        console.log('[AUDIT] Compliance report endpoints not yet implemented');
        alert('Compliance report feature coming soon');
      } else {
        console.error('Error downloading compliance report:', err);
        alert('Failed to download compliance report');
      }
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
              by {log.signature.caller.commonName} ({log.signature.caller.role && log.signature.caller.role !== 'unknown' 
                ? log.signature.caller.role 
                : log.signature.caller.organizationUnit || log.signature.caller.mspId})
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
                  {log.signature.caller.role && log.signature.caller.role !== 'unknown' 
                    ? log.signature.caller.role 
                    : log.signature.caller.organizationUnit || log.signature.caller.mspId}
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
