// Customs Quality Inspection Monitoring Component
// Shows quality inspections relevant to customs clearance
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Typography,
} from '@mui/material';
import { Assignment, CheckCircle, Visibility } from '@mui/icons-material';
import { AnimatedButton, StatusChip, StatusType } from '@/components/modern';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import { useNotification } from '@/hooks/useNotification';
import api from '@/utils/api';
import { apiFetch, getAuthHeaders } from '@/config/api.config';


interface QualityInspection {
  inspectionId: string;
  shipmentId: string;
  exporterId: string;
  contractId: string;
  status: string;
  inspectorName?: string;
  certificateNo?: string;
  exportPermitNo?: string;
  requestDate?: string;
  approvalDate?: string;
  classification?: string;
  qualityGrade?: string;
  cuppingGrade?: string;
  totalScore?: number;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const CustomsInspection: React.FC = () => {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const { notification, showSuccess, showError, closeNotification } = useNotification();

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('[CUSTOMS-INSPECTIONS] No auth token');
        setLoading(false);
        return;
      }

      // Load all quality inspections from blockchain
      const response = await apiFetch('/quality/inspections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log(`[CUSTOMS-INSPECTIONS] Loaded ${result.data.length} quality inspections`);
        console.log('[CUSTOMS-INSPECTIONS] Sample inspection data:', result.data[0]);
        console.log('[CUSTOMS-INSPECTIONS] Fields:', Object.keys(result.data[0] || {}));
        setInspections(result.data);
      } else {
        console.log('[CUSTOMS-INSPECTIONS] No inspections found or query failed');
        setInspections([]);
      }
    } catch (error) {
      console.error('[CUSTOMS-INSPECTIONS] Failed to load inspections:', error);
      setInspections([]);
      showError(
        'Failed to Load Inspections',
        'Unable to retrieve quality inspection records',
        'Please check your connection and try again'
      );
    } finally {
      setLoading(false);
    }
  };

  const getInspectionId = (inspection: QualityInspection) => {
    return inspection.inspectionId || '';
  };

  const getShipmentId = (inspection: QualityInspection) => {
    return inspection.shipmentId || '';
  };

  const getExporterId = (inspection: QualityInspection) => {
    return inspection.exporterId || '';
  };

  const getStatus = (inspection: QualityInspection) => {
    return inspection.status || 'UNKNOWN';
  };

  const getCertificateNo = (inspection: QualityInspection) => {
    return inspection.certificateNo || 'N/A';
  };

  const getExportPermitNo = (inspection: QualityInspection) => {
    return inspection.exportPermitNo || 'Not Issued';
  };

  const getInspectorName = (inspection: QualityInspection) => {
    return inspection.inspectorName || 'N/A';
  };

  const getRequestDate = (inspection: QualityInspection) => {
    const date = inspection.createdAt;
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return date;
    }
  };

  const getClassification = (inspection: QualityInspection) => {
    return inspection.classification || 'N/A';
  };

  const getQualityGrade = (inspection: QualityInspection) => {
    return inspection.qualityGrade || 'N/A';
  };

  const getCuppingGrade = (inspection: QualityInspection) => {
    return inspection.cuppingGrade || 'N/A';
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" fontWeight={600}>Quality Inspection Records</Typography>
        <Typography variant="body2">
          Monitor quality inspections performed by ECTA. Approved inspections with export permits can proceed to customs clearance.
        </Typography>
      </Alert>

      {loading && <Alert severity="info" sx={{ mb: 2 }}>Loading quality inspections...</Alert>}

      {!loading && inspections.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>No Quality Inspection Records Found</Typography>
          <Typography variant="body2">
            Inspections must be completed by ECTA before customs declarations can be processed.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>To create inspections:</strong> ECTA Portal → Quality Inspections → Request Inspection
          </Typography>
        </Alert>
      )}

      {!loading && inspections.length > 0 && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>Inspection Status Legend</Typography>
            <Typography variant="body2" component="div">
              • <strong>PENDING</strong> - Inspection requested, awaiting ECTA to perform tests<br/>
              • <strong>INSPECTED</strong> - Tests completed, awaiting approval<br/>
              • <strong>APPROVED</strong> - Certificate issued, ready for customs<br/>
              • <strong>N/A fields</strong> - Will be filled when ECTA completes the inspection workflow
            </Typography>
          </Alert>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Inspection ID</TableCell>
                  <TableCell>Shipment ID</TableCell>
                  <TableCell>Exporter</TableCell>
                  <TableCell>Classification</TableCell>
                  <TableCell>Certificate</TableCell>
                  <TableCell>Export Permit</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inspections.map((inspection) => (
                  <TableRow key={getInspectionId(inspection)}>
                    <TableCell>{getInspectionId(inspection)}</TableCell>
                    <TableCell>{getShipmentId(inspection)}</TableCell>
                    <TableCell>{getExporterId(inspection)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getClassification(inspection)} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{getCertificateNo(inspection)}</TableCell>
                    <TableCell>
                      {getExportPermitNo(inspection) !== 'Not Issued' ? (
                        <Chip label={getExportPermitNo(inspection)} size="small" color="success" />
                      ) : (
                        <Chip label="Not Issued" size="small" color="default" />
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip 
                        status={getStatus(inspection) as StatusType}
                        label={getStatus(inspection)} 
                      />
                    </TableCell>
                    <TableCell>
                      <AnimatedButton
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => {
                          setSelectedInspection(inspection);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        View Details
                      </AnimatedButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Inspection Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Quality Inspection Details</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedInspection && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600}>Inspection Information</Typography>
                  <Typography variant="body2">
                    Quality inspection record from ECTA for customs verification
                  </Typography>
                </Alert>
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Inspection ID"
                  value={getInspectionId(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Status"
                  value={getStatus(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Shipment ID"
                  value={getShipmentId(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Exporter ID"
                  value={getExporterId(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Classification"
                  value={getClassification(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Quality Grade"
                  value={getQualityGrade(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Cupping Grade"
                  value={getCuppingGrade(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Total Score"
                  value={selectedInspection.totalScore ? selectedInspection.totalScore.toFixed(1) : 'N/A'}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Certificate Number"
                  value={getCertificateNo(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Export Permit Number"
                  value={getExportPermitNo(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Inspector"
                  value={getInspectorName(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Inspection Date"
                  value={getRequestDate(selectedInspection)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              {selectedInspection.remarks && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    value={selectedInspection.remarks}
                    InputProps={{ readOnly: true }}
                    multiline
                    rows={2}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                {getStatus(selectedInspection) === 'PENDING' ? (
                  <Alert severity="warning">
                    <Typography variant="body2" fontWeight={600}>
                      ⏳ Inspection Pending - Awaiting ECTA
                    </Typography>
                    <Typography variant="body2">
                      This inspection has been requested but not yet performed by ECTA Quality Lab.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Next Steps (ECTA Portal):</strong><br/>
                      1. Perform Inspection - Add physical and cupping test results<br/>
                      2. Approve Inspection - Issue quality certificate<br/>
                      3. Issue Export Permit - Authorize export<br/>
                      <br/>
                      After completion, all fields (Classification, Certificate, Export Permit) will be populated.
                    </Typography>
                  </Alert>
                ) : getStatus(selectedInspection) === 'INSPECTED' ? (
                  <Alert severity="info">
                    <Typography variant="body2" fontWeight={600}>
                      🔬 Inspection Completed - Awaiting Approval
                    </Typography>
                    <Typography variant="body2">
                      ECTA has completed testing. Awaiting final approval and certificate issuance.
                    </Typography>
                  </Alert>
                ) : getStatus(selectedInspection) === 'APPROVED' ? (
                  <Alert severity="success">
                    <Typography variant="body2" fontWeight={600}>
                      ✅ Inspection Approved - Ready for Customs
                    </Typography>
                    <Typography variant="body2">
                      This shipment has passed quality inspection{getExportPermitNo(selectedInspection) !== 'Not Issued' ? ' and received export permit' : ''}. Ready for customs declaration.
                    </Typography>
                  </Alert>
                ) : (
                  <Alert severity="error">
                    <Typography variant="body2" fontWeight={600}>
                      ❌ Inspection {getStatus(selectedInspection)}
                    </Typography>
                    <Typography variant="body2">
                      This inspection has been rejected or requires rework. Contact ECTA for details.
                    </Typography>
                  </Alert>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailsDialogOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      <NotificationDialog
        open={notification.open}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />
    </Box>
  );
};
