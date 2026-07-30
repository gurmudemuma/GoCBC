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
  TablePagination,
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

interface CustomsInspectionProps {
  onCreateDeclaration?: (shipmentId: string, inspectionId: string) => void;
}

export const CustomsInspection: React.FC<CustomsInspectionProps> = ({ onCreateDeclaration }) => {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
        
        // Load existing declarations to filter out inspections that already have declarations
        let existingDeclarationShipments: Set<string> = new Set();
        try {
          const declResponse = await apiFetch('/customs/declarations', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const declResult = await declResponse.json();
          
          if (declResult.success && declResult.data) {
            existingDeclarationShipments = new Set(
              declResult.data.map((d: any) => d.shipmentId || d.ShipmentID || d.shipmentID || '')
            );
            console.log(`[CUSTOMS-INSPECTIONS] Found ${existingDeclarationShipments.size} shipments with existing declarations`);
          }
        } catch (error) {
          console.warn('[CUSTOMS-INSPECTIONS] Could not load existing declarations:', error);
        }
        
        // Filter to only show APPROVED inspections with export permits that DON'T have declarations yet
        const permitReady = result.data.filter((insp: any) => {
          const status = (insp.status || insp.Status || '').toString().toUpperCase();
          const permitNo = (insp.exportPermitNo || insp.ExportPermitNo || insp.exportPermit || '').toString();
          const certificateNo = (insp.certificateNo || insp.CertificateNo || insp.certificate || '').toString();
          const shipmentId = (insp.shipmentId || insp.ShipmentID || '').toString();
          
          // Check approval by status OR by having both certificate and permit
          const statusApproved = status === 'APPROVED' || status === 'QUALITY_APPROVED';
          const hasCertificate = certificateNo && certificateNo.trim() !== '' && certificateNo.toUpperCase() !== 'N/A';
          const hasPermit = permitNo && permitNo.trim() !== '' && permitNo.toUpperCase() !== 'NOT ISSUED' && permitNo.toUpperCase() !== 'N/A';
          
          // If both certificate and permit exist, inspection is approved (regardless of status field)
          const isApprovedByDocuments = hasCertificate && hasPermit;
          const isApproved = statusApproved || isApprovedByDocuments;
          
          // Check if declaration already exists for this shipment
          const hasDeclaration = existingDeclarationShipments.has(shipmentId);
          
          // Debug logging for filtering
          if (hasDeclaration) {
            console.log(`[CUSTOMS-INSPECTIONS] ✅ Declaration exists for ${shipmentId} (inspection ${insp.inspectionId || insp.InspectionID}) - moving to workflow tabs`);
          } else if (!isApproved || !hasPermit) {
            console.log(`[CUSTOMS-INSPECTIONS] ❌ Filtered out inspection ${insp.inspectionId || insp.InspectionID}: status=${status}, statusApproved=${statusApproved}, certificate=${certificateNo}, permit=${permitNo}, isApprovedByDocs=${isApprovedByDocuments}`);
          }
          
          // Show ONLY inspections that are approved with permits AND don't have declarations yet
          return isApproved && hasPermit && !hasDeclaration;
        });
        
        console.log(`[CUSTOMS-INSPECTIONS] Filtered to ${permitReady.length} permit-ready inspections WITHOUT declarations`);
        setInspections(permitReady);
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
                {inspections
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((inspection) => (
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
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <AnimatedButton
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => {
                            setSelectedInspection(inspection);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          View
                        </AnimatedButton>
                        {getStatus(inspection) === 'APPROVED' && getExportPermitNo(inspection) !== 'Not Issued' && (
                          <AnimatedButton
                            size="small"
                            variant="contained"
                            brandColor="#4caf50"
                            startIcon={<CheckCircle />}
                            onClick={() => {
                              // Create customs declaration from this permit
                              if (onCreateDeclaration) {
                                onCreateDeclaration(getShipmentId(inspection), getInspectionId(inspection));
                              } else {
                                console.error('[CUSTOMS-INSPECTION] No onCreateDeclaration handler provided');
                              }
                            }}
                          >
                            Create Declaration
                          </AnimatedButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={inspections.length}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
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
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          {selectedInspection && getStatus(selectedInspection) === 'APPROVED' && getExportPermitNo(selectedInspection) !== 'Not Issued' && (
            <AnimatedButton
              variant="contained"
              brandColor="#4caf50"
              startIcon={<Assignment />}
              onClick={() => {
                // Create customs declaration from this permit
                if (onCreateDeclaration) {
                  onCreateDeclaration(getShipmentId(selectedInspection), getInspectionId(selectedInspection));
                  setDetailsDialogOpen(false);
                } else {
                  console.error('[CUSTOMS-INSPECTION] No onCreateDeclaration handler provided');
                }
              }}
            >
              Create Customs Declaration
            </AnimatedButton>
          )}
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
