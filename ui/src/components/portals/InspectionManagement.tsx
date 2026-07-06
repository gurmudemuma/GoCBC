// Inspection Management Component for ECTAPortal
import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Button,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import { CheckCircle, Cancel, Assignment, Refresh } from '@mui/icons-material';
import { AnimatedButton, StatusChip } from '@/components/modern';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import api from '@/utils/api';

interface Inspection {
  inspectionId: string;
  shipmentId: string;
  exporterId: string;
  contractId: string;
  status: string;
  qualityGrade?: string;
  cuppingGrade?: string;
  totalScore?: number;
  inspectorName?: string;
  approvedBy?: string;
  certificateNo?: string;
  exportPermitNo?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export const InspectionManagement: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);

  // Approve dialog
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [approvedBy, setApprovedBy] = useState('');
  const [certificateNo, setCertificateNo] = useState('');

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectedBy, setRejectedBy] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Permit dialog
  const [permitDialogOpen, setPermitDialogOpen] = useState(false);
  const [permitNumber, setPermitNumber] = useState('');
  const [issuedBy, setIssuedBy] = useState('');

  const [notification, setNotification] = useState({
    open: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    details: '',
  });

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const response = await api.get('/quality/inspections');
      if (response.data.success) {
        setInspections(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const autoGenCert = () => {
    const d = new Date();
    const ds = d.toISOString().split('T')[0].replace(/-/g, '');
    setCertificateNo(`CERT-${ds}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
  };

  const autoGenPermit = () => {
    const d = new Date();
    const ds = d.toISOString().split('T')[0].replace(/-/g, '');
    setPermitNumber(`EP-${ds}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
  };

  const openApproveDialog = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setApprovedBy('');
    autoGenCert();
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setRejectedBy('');
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const openPermitDialog = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setIssuedBy('');
    autoGenPermit();
    setPermitDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedInspection || !approvedBy || !certificateNo) return;
    try {
      const res = await api.post(`/quality/inspections/${selectedInspection.inspectionId}/approve`, {
        approvedBy,
        certificateNo,
      });
      if (res.data.success) {
        setNotification({ 
          open: true, 
          type: 'success', 
          title: '✅ Inspection Approved', 
          message: `Certificate ${certificateNo} issued for ${selectedInspection.shipmentId}.`, 
          details: '🎯 NEXT STEP: Click "Issue Permit" button to generate export permit. This will authorize customs clearance.' 
        });
        setApproveDialogOpen(false);
        loadInspections();
      } else {
        setNotification({ open: true, type: 'error', title: 'Approval Failed', message: res.data.error?.message || 'Failed to approve', details: '' });
      }
    } catch (err: any) {
      setNotification({ open: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || err.message, details: '' });
    }
  };

  const handleReject = async () => {
    if (!selectedInspection || !rejectedBy || !rejectionReason) return;
    try {
      const res = await api.post(`/quality/inspections/${selectedInspection.inspectionId}/reject`, {
        rejectedBy,
        rejectionReason,
      });
      if (res.data.success) {
        setNotification({ open: true, type: 'warning', title: '⚠️ Inspection Rejected', message: `Shipment ${selectedInspection.shipmentId} did not pass quality standards.`, details: `Reason: ${rejectionReason}` });
        setRejectDialogOpen(false);
        loadInspections();
      } else {
        setNotification({ open: true, type: 'error', title: 'Rejection Failed', message: res.data.error?.message || 'Failed to reject', details: '' });
      }
    } catch (err: any) {
      setNotification({ open: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || err.message, details: '' });
    }
  };

  const handleIssuePermit = async () => {
    if (!selectedInspection || !permitNumber || !issuedBy) return;
    try {
      const res = await api.post(`/quality/inspections/${selectedInspection.inspectionId}/issue-permit`, {
        exportPermitNo: permitNumber,
        issuedBy,
      });
      if (res.data.success) {
        setNotification({ 
          open: true, 
          type: 'success', 
          title: '✅ Export Permit Issued', 
          message: `Permit ${permitNumber} issued for ${selectedInspection.shipmentId}.`, 
          details: '🎯 NEXT STEPS:\n1. Exporter proceeds to CUSTOMS for clearance\n2. Customs officer verifies permit & documents\n3. After clearance, shipment moves to SHIPPING' 
        });
        setPermitDialogOpen(false);
        loadInspections();
      } else {
        setNotification({ open: true, type: 'error', title: 'Failed to Issue Permit', message: res.data.error?.message || 'Unknown error', details: '' });
      }
    } catch (err: any) {
      setNotification({ open: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || err.message, details: '' });
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'INSPECTED': return 'info';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">All Quality Inspections</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={loadInspections} size="small" disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {inspections.length === 0 && !loading && (
        <Alert severity="info">No inspections found. Inspections are created automatically when a shipment is created.</Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><strong>Inspection ID</strong></TableCell>
              <TableCell><strong>Shipment</strong></TableCell>
              <TableCell><strong>Exporter</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Grade / Score</strong></TableCell>
              <TableCell><strong>Certificate / Permit</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inspections.map((insp) => (
              <TableRow key={insp.inspectionId} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {insp.inspectionId.replace('INSPECTION_', '').substring(0, 16)}…
                </TableCell>
                <TableCell>{insp.shipmentId}</TableCell>
                <TableCell>{insp.exporterId}</TableCell>
                <TableCell>
                  <Chip
                    label={insp.status}
                    color={statusColor(insp.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {insp.qualityGrade ? (
                    <Box>
                      <Typography variant="caption" display="block">{insp.qualityGrade}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Score: {insp.totalScore?.toFixed(1)}/100
                      </Typography>
                    </Box>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  {insp.certificateNo && <Typography variant="caption" display="block">Cert: {insp.certificateNo}</Typography>}
                  {insp.exportPermitNo && <Typography variant="caption" display="block" color="success.main">Permit: {insp.exportPermitNo}</Typography>}
                  {insp.rejectionReason && <Typography variant="caption" display="block" color="error.main">Rejected</Typography>}
                  {!insp.certificateNo && !insp.exportPermitNo && !insp.rejectionReason && '—'}
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5}>
                    {/* INSPECTED → Approve or Reject */}
                    {insp.status === 'INSPECTED' && (
                      <>
                        <Tooltip title="Approve Quality">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
                            onClick={() => openApproveDialog(insp)}
                            sx={{ fontSize: 11, px: 1 }}
                          >
                            Approve
                          </Button>
                        </Tooltip>
                        <Tooltip title="Reject Quality">
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel sx={{ fontSize: 14 }} />}
                            onClick={() => openRejectDialog(insp)}
                            sx={{ fontSize: 11, px: 1 }}
                          >
                            Reject
                          </Button>
                        </Tooltip>
                      </>
                    )}
                    {/* APPROVED → Issue Permit */}
                    {insp.status === 'APPROVED' && !insp.exportPermitNo && (
                      <Tooltip title="Issue Export Permit">
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<Assignment sx={{ fontSize: 14 }} />}
                          onClick={() => openPermitDialog(insp)}
                          sx={{ fontSize: 11, px: 1 }}
                        >
                          Issue Permit
                        </Button>
                      </Tooltip>
                    )}
                    {insp.status === 'APPROVED' && insp.exportPermitNo && (
                      <Box>
                        <Chip label="✅ Permit Issued" color="success" size="small" variant="filled" sx={{ mb: 0.5 }} />
                        <Typography variant="caption" color="primary" display="block" sx={{ fontWeight: 600 }}>
                          → Next: Customs Clearance
                        </Typography>
                      </Box>
                    )}
                    {insp.status === 'PENDING' && (
                      <Typography variant="caption" color="text.secondary">
                        ⏳ Awaiting inspection
                      </Typography>
                    )}
                    {insp.status === 'REJECTED' && (
                      <Chip label="Rejected" color="error" size="small" variant="outlined" />
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Quality Inspection</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Approving: <strong>{selectedInspection?.shipmentId}</strong>
            {selectedInspection?.qualityGrade && ` — ${selectedInspection.qualityGrade} (${selectedInspection.totalScore?.toFixed(1)}/100)`}
          </Alert>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Approved By *</InputLabel>
            <Select value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} label="Approved By *">
              <MenuItem value="Dr. Getachew Amare">Dr. Getachew Amare (Quality Director)</MenuItem>
              <MenuItem value="Ato Mekonnen Solomon">Ato Mekonnen Solomon (Senior Manager)</MenuItem>
              <MenuItem value="W/ro Hana Tesfaye">W/ro Hana Tesfaye (Quality Manager)</MenuItem>
              <MenuItem value="Dr. Yohannes Assefa">Dr. Yohannes Assefa (Chief Q-Grader)</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Certificate Number" value={certificateNo}
            onChange={(e) => setCertificateNo(e.target.value)} helperText="Auto-generated — edit if needed" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<CheckCircle />}
            onClick={handleApprove} disabled={!approvedBy || !certificateNo}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Quality Inspection</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Rejecting: <strong>{selectedInspection?.shipmentId}</strong>. This cannot be undone.
          </Alert>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Rejected By *</InputLabel>
            <Select value={rejectedBy} onChange={(e) => setRejectedBy(e.target.value)} label="Rejected By *">
              <MenuItem value="Dr. Getachew Amare">Dr. Getachew Amare (Quality Director)</MenuItem>
              <MenuItem value="Ato Mekonnen Solomon">Ato Mekonnen Solomon (Senior Manager)</MenuItem>
              <MenuItem value="W/ro Hana Tesfaye">W/ro Hana Tesfaye (Quality Manager)</MenuItem>
              <MenuItem value="Dr. Yohannes Assefa">Dr. Yohannes Assefa (Chief Q-Grader)</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth multiline rows={3} required label="Rejection Reason *"
            value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
            helperText="This will be visible to the exporter"
            placeholder="e.g., Moisture content exceeds 12%, defect count above Grade 5 threshold..." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" startIcon={<Cancel />}
            onClick={handleReject} disabled={!rejectedBy || !rejectionReason}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Issue Permit Dialog */}
      <Dialog open={permitDialogOpen} onClose={() => setPermitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Issue Export Permit</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Quality approved for <strong>{selectedInspection?.shipmentId}</strong>. Issue export permit to allow customs clearance.
          </Alert>
          <TextField fullWidth label="Export Permit Number" value={permitNumber}
            onChange={(e) => setPermitNumber(e.target.value)} sx={{ mb: 2 }}
            helperText="Auto-generated format: EP-YYYYMMDD-XXX" />
          <FormControl fullWidth>
            <InputLabel>Issued By *</InputLabel>
            <Select value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} label="Issued By *">
              <MenuItem value="Ato Alemayehu Tadesse">Ato Alemayehu Tadesse (Permit Officer)</MenuItem>
              <MenuItem value="W/ro Tsion Gebre">W/ro Tsion Gebre (Export Coordinator)</MenuItem>
              <MenuItem value="Ato Dawit Hailu">Ato Dawit Hailu (Senior Inspector)</MenuItem>
              <MenuItem value="W/ro Meron Worku">W/ro Meron Worku (Trade Facilitator)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermitDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<Assignment />}
            onClick={handleIssuePermit} disabled={!permitNumber || !issuedBy}>
            Issue Permit
          </Button>
        </DialogActions>
      </Dialog>

      <NotificationDialog
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />
    </Box>
  );
};
