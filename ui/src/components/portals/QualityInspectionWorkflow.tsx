// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Quality Inspection Workflow - Complete inspection process

import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Divider,
  FormHelperText,
} from '@mui/material';
import {
  Science,
  Assignment,
  CheckCircle,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { AnimatedButton } from '@/components/modern';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import { useNotification } from '@/hooks/useNotification';
import api from '@/utils/api';

interface QualityInspectionWorkflowProps {
  shipment: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const QualityInspectionWorkflow: React.FC<QualityInspectionWorkflowProps> = ({
  shipment,
  onClose,
  onSuccess,
}) => {
  const { notification, showSuccess, showError, showWarning, closeNotification } = useNotification();
  const [step, setStep] = useState<'perform' | 'approve' | 'permit'>('perform');
  const [loading, setLoading] = useState(false);
  const [inspectionData, setInspectionData] = useState<any>(null);
  const [exporterTaster, setExporterTaster] = useState<string>('');
  const [loadingExporter, setLoadingExporter] = useState(true);

  // Perform Inspection Form Data
  const [inspectionForm, setInspectionForm] = useState({
    inspectorName: '',
    sampleSize: '300',
    moistureContent: '11.5',
    defectCount: '2',
    beanSize: '17',
    color: 'Green',
    odor: 'Clean',
    fragrance: '8.5',
    flavor: '8.5',
    aftertaste: '8.0',
    acidity: '8.5',
    body: '8.0',
    balance: '8.0',
    uniformity: '10',
    cleanCup: '10',
    sweetness: '10',
    overall: '8.5',
    classification: 'WASHED',
    pesticideTest: 'PASSED',
    heavyMetalTest: 'PASSED',
    mycotoxinTest: 'PASSED',
    remarks: '',
  });

  // Approve Inspection Form Data
  const [approvalForm, setApprovalForm] = useState({
    approvedBy: '',
    certificateNo: '',
  });

  // Export Permit Form Data
  const [permitForm, setPermitForm] = useState({
    exportPermitNo: '',
    issuedBy: '',
  });

  // Auto-generate IDs
  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    setApprovalForm(prev => ({
      ...prev,
      certificateNo: `CERT-${dateStr}-${Math.floor(Math.random() * 1000)}`,
    }));

    setPermitForm(prev => ({
      ...prev,
      exportPermitNo: `EP-${dateStr}-${Math.floor(Math.random() * 1000)}`,
    }));
  }, []);

  // Fetch exporter's registered taster (for information only - not official inspector)
  useEffect(() => {
    const fetchExporter = async () => {
      try {
        setLoadingExporter(true);
        const response = await api.get(`/exporters/${shipment.exporterId}`);
        if (response.data?.success && response.data?.data) {
          const taster = response.data.data.professionalTaster || '';
          setExporterTaster(taster);
          // Note: Do NOT auto-select the taster - ECTA inspector must be selected
        }
      } catch (error) {
        console.error('Failed to fetch exporter:', error);
      } finally {
        setLoadingExporter(false);
      }
    };

    if (shipment?.exporterId) {
      fetchExporter();
    }
  }, [shipment]);

  const handlePerformInspection = async () => {
    if (!inspectionForm.inspectorName) {
      showError('Validation Error', 'Please select an ECTA inspector');
      return;
    }

    setLoading(true);
    try {
      const inspectionId = `INSPECTION_${shipment.shipmentId}_${Date.now()}`;

      // Create inspection request first
      await api.post('/quality/inspections', {
        inspectionID: inspectionId,
        shipmentID: shipment.shipmentId,
        contractID: shipment.contractId || 'CONTRACT_' + shipment.exporterId,
        exporterID: shipment.exporterId,
      });

      // Perform inspection
      const response = await api.post(`/quality/inspections/${inspectionId}/perform`, {
        inspectorID: 'INSPECTOR_001',
        inspectorName: inspectionForm.inspectorName,
        sampleSize: parseFloat(inspectionForm.sampleSize),
        moistureContent: parseFloat(inspectionForm.moistureContent),
        defectCount: parseInt(inspectionForm.defectCount),
        beanSize: inspectionForm.beanSize,
        color: inspectionForm.color,
        odor: inspectionForm.odor,
        fragrance: parseFloat(inspectionForm.fragrance),
        flavor: parseFloat(inspectionForm.flavor),
        aftertaste: parseFloat(inspectionForm.aftertaste),
        acidity: parseFloat(inspectionForm.acidity),
        body: parseFloat(inspectionForm.body),
        balance: parseFloat(inspectionForm.balance),
        uniformity: parseFloat(inspectionForm.uniformity),
        cleanCup: parseFloat(inspectionForm.cleanCup),
        sweetness: parseFloat(inspectionForm.sweetness),
        overall: parseFloat(inspectionForm.overall),
        classification: inspectionForm.classification,
        pesticideTest: inspectionForm.pesticideTest,
        heavyMetalTest: inspectionForm.heavyMetalTest,
        mycotoxinTest: inspectionForm.mycotoxinTest,
        remarks: inspectionForm.remarks,
      });

      if (response.data?.success) {
        setInspectionData({ ...response.data.data, inspectionId });
        showSuccess(
          'Inspection Performed',
          `Quality inspection completed for ${shipment.shipmentId}. Total Score: ${calculateTotalScore()}/100`,
          `Grade: ${getQualityGrade()} • Cupping: ${getCuppingGrade()}`
        );
        setStep('approve');
      } else {
        showError('Inspection Failed', response.data?.error?.message || 'Failed to perform inspection');
      }
    } catch (error: any) {
      showError('Inspection Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveInspection = async () => {
    if (!approvalForm.approvedBy || !approvalForm.certificateNo) {
      showError('Validation Error', 'Please fill in all approval fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/quality/inspections/${inspectionData.inspectionId}/approve`, {
        approvedBy: approvalForm.approvedBy,
        certificateNo: approvalForm.certificateNo,
      });

      if (response.data?.success) {
        showSuccess(
          'Inspection Approved',
          `Quality approved for ${shipment.shipmentId}. Certificate: ${approvalForm.certificateNo}`,
          'Ready to issue export permit'
        );
        setStep('permit');
      } else {
        showError('Approval Failed', response.data?.error?.message || 'Failed to approve inspection');
      }
    } catch (error: any) {
      showError('Approval Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleIssuePermit = async () => {
    if (!permitForm.issuedBy || !permitForm.exportPermitNo) {
      showError('Validation Error', 'Please fill in all permit fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/quality/inspections/${inspectionData.inspectionId}/issue-permit`, {
        exportPermitNo: permitForm.exportPermitNo,
        issuedBy: permitForm.issuedBy,
      });

      if (response.data?.success) {
        showSuccess(
          'Export Permit Issued',
          `Export permit ${permitForm.exportPermitNo} issued successfully.`,
          'Coffee cleared for export. Exporter can now proceed to customs declaration.'
        );
        // Call onSuccess callback to refresh the list
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        showError('Permit Issuance Failed', response.data?.error?.message || 'Failed to issue permit');
      }
    } catch (error: any) {
      showError('Permit Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalScore = () => {
    const scores = [
      'fragrance', 'flavor', 'aftertaste', 'acidity', 'body',
      'balance', 'uniformity', 'cleanCup', 'sweetness', 'overall',
    ];
    return scores.reduce((sum, key) => sum + parseFloat(inspectionForm[key as keyof typeof inspectionForm] || '0'), 0);
  };

  const getQualityGrade = () => {
    const totalScore = calculateTotalScore();
    const defects = parseInt(inspectionForm.defectCount);
    
    if (defects <= 3 && totalScore >= 80) return 'Grade 1';
    if (defects <= 12 && totalScore >= 80) return 'Grade 2';
    if (defects <= 25 && totalScore >= 75) return 'Grade 3';
    return 'Below Export Standard';
  };

  const getCuppingGrade = () => {
    const totalScore = calculateTotalScore();
    if (totalScore >= 90) return 'Specialty (90+)';
    if (totalScore >= 85) return 'Premium (85-89)';
    if (totalScore >= 80) return 'Q-Grade (80-84)';
    return 'Below Standard';
  };

  return (
    <>
      <Dialog open fullWidth maxWidth="md" onClose={onClose}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Science color="primary" />
            <Typography variant="h6">
              Quality Inspection Workflow - {shipment.shipmentId}
            </Typography>
          </Box>
          <Box mt={1}>
            <Chip
              label={step === 'perform' ? 'Step 1: Perform Inspection' : step === 'approve' ? 'Step 2: Approve Quality' : 'Step 3: Issue Export Permit'}
              color="primary"
              size="small"
            />
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {/* Shipment Info */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Origin:</strong> {shipment.origin} • <strong>Quantity:</strong> {shipment.quantity}kg •{' '}
            <strong>Grade:</strong> {shipment.grade} • <strong>ICO:</strong> {shipment.icoNumber}
            {exporterTaster && (
              <>
                <br />
                <strong>Exporter's Taster (Reference):</strong> {exporterTaster} (May attend but cannot perform official inspection)
              </>
            )}
          </Alert>

          {/* STEP 1: Perform Inspection */}
          {step === 'perform' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Physical & Cupping Inspection
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>ECTA Official Inspector *</InputLabel>
                    <Select
                      value={inspectionForm.inspectorName}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, inspectorName: e.target.value })}
                      label="ECTA Official Inspector *"
                      disabled={loadingExporter}
                    >
                      <MenuItem value="Dr. Abebe Tadesse">Dr. Abebe Tadesse (ECTA Senior Q-Grader - License #QG-ETH-001)</MenuItem>
                      <MenuItem value="Tigist Haile">Tigist Haile (ECTA Q-Grader - License #QG-ETH-015)</MenuItem>
                      <MenuItem value="Mulugeta Kebede">Mulugeta Kebede (ECTA Q-Grader - License #QG-ETH-023)</MenuItem>
                      <MenuItem value="Selamawit Bekele">Selamawit Bekele (ECTA Lead Cupper - License #QG-ETH-008)</MenuItem>
                    </Select>
                    <FormHelperText>
                      ⚠️ MANDATORY: Only ECTA-licensed Q-Graders can perform official quality inspection. 
                      {exporterTaster && ` (Note: ${exporterTaster} is the exporter's taster - for reference only)`}
                    </FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="Physical Inspection" size="small" />
                  </Divider>
                </Grid>

                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Sample Size (g)"
                    value={inspectionForm.sampleSize}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, sampleSize: e.target.value })}
                    helperText="Standard: 300g"
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Moisture Content (%)"
                    value={inspectionForm.moistureContent}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, moistureContent: e.target.value })}
                    helperText="Max: 12%"
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Defect Count"
                    value={inspectionForm.defectCount}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, defectCount: e.target.value })}
                    helperText="Per 300g sample"
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Bean Size</InputLabel>
                    <Select
                      value={inspectionForm.beanSize}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, beanSize: e.target.value })}
                      label="Bean Size"
                    >
                      <MenuItem value="14">Screen 14</MenuItem>
                      <MenuItem value="15">Screen 15</MenuItem>
                      <MenuItem value="16">Screen 16</MenuItem>
                      <MenuItem value="17">Screen 17</MenuItem>
                      <MenuItem value="18">Screen 18</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Color</InputLabel>
                    <Select
                      value={inspectionForm.color}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, color: e.target.value })}
                      label="Color"
                    >
                      <MenuItem value="Green">Green</MenuItem>
                      <MenuItem value="Bluish">Bluish</MenuItem>
                      <MenuItem value="Brownish">Brownish</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Odor</InputLabel>
                    <Select
                      value={inspectionForm.odor}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, odor: e.target.value })}
                      label="Odor"
                    >
                      <MenuItem value="Clean">Clean</MenuItem>
                      <MenuItem value="Fermented">Fermented</MenuItem>
                      <MenuItem value="Musty">Musty</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="Cupping Test (SCA 100-point scale)" size="small" />
                  </Divider>
                </Grid>

                {[
                  { key: 'fragrance', label: 'Fragrance/Aroma' },
                  { key: 'flavor', label: 'Flavor' },
                  { key: 'aftertaste', label: 'Aftertaste' },
                  { key: 'acidity', label: 'Acidity' },
                  { key: 'body', label: 'Body' },
                  { key: 'balance', label: 'Balance' },
                  { key: 'uniformity', label: 'Uniformity' },
                  { key: 'cleanCup', label: 'Clean Cup' },
                  { key: 'sweetness', label: 'Sweetness' },
                  { key: 'overall', label: 'Overall' },
                ].map(({ key, label }) => (
                  <Grid item xs={6} md={2.4} key={key}>
                    <TextField
                      fullWidth
                      label={label}
                      value={inspectionForm[key as keyof typeof inspectionForm]}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, [key]: e.target.value })}
                      helperText="/10"
                      inputProps={{ step: 0.5, min: 0, max: 10 }}
                    />
                  </Grid>
                ))}

                <Grid item xs={12}>
                  <Alert severity="info">
                    <strong>Total Score:</strong> {calculateTotalScore()}/100 • <strong>Quality Grade:</strong> {getQualityGrade()} •{' '}
                    <strong>Cupping Grade:</strong> {getCuppingGrade()}
                  </Alert>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="Processing & Compliance" size="small" />
                  </Divider>
                </Grid>

                <Grid item xs={4}>
                  <FormControl fullWidth>
                    <InputLabel>Classification</InputLabel>
                    <Select
                      value={inspectionForm.classification}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, classification: e.target.value })}
                      label="Classification"
                    >
                      <MenuItem value="WASHED">Washed</MenuItem>
                      <MenuItem value="NATURAL">Natural</MenuItem>
                      <MenuItem value="HONEY">Honey Process</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4}>
                  <FormControl fullWidth>
                    <InputLabel>Pesticide Test</InputLabel>
                    <Select
                      value={inspectionForm.pesticideTest}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, pesticideTest: e.target.value })}
                      label="Pesticide Test"
                    >
                      <MenuItem value="PASSED">Passed</MenuItem>
                      <MenuItem value="FAILED">Failed</MenuItem>
                      <MenuItem value="NOT_TESTED">Not Tested</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4}>
                  <FormControl fullWidth>
                    <InputLabel>Heavy Metal Test</InputLabel>
                    <Select
                      value={inspectionForm.heavyMetalTest}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, heavyMetalTest: e.target.value })}
                      label="Heavy Metal Test"
                    >
                      <MenuItem value="PASSED">Passed</MenuItem>
                      <MenuItem value="FAILED">Failed</MenuItem>
                      <MenuItem value="NOT_TESTED">Not Tested</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Inspection Remarks"
                    value={inspectionForm.remarks}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, remarks: e.target.value })}
                    helperText="Additional observations or notes"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* STEP 2: Approve Inspection */}
          {step === 'approve' && (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                <strong>Inspection Completed!</strong> Total Score: {calculateTotalScore()}/100 • Grade: {getQualityGrade()}
              </Alert>

              <Typography variant="h6" gutterBottom>
                Quality Approval
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Approved By *</InputLabel>
                    <Select
                      value={approvalForm.approvedBy}
                      onChange={(e) => setApprovalForm({ ...approvalForm, approvedBy: e.target.value })}
                      label="Approved By *"
                    >
                      <MenuItem value="Dr. Getachew Amare">Dr. Getachew Amare (Quality Director)</MenuItem>
                      <MenuItem value="Ato Mekonnen Solomon">Ato Mekonnen Solomon (Senior Manager)</MenuItem>
                      <MenuItem value="W/ro Hana Tesfaye">W/ro Hana Tesfaye (Quality Manager)</MenuItem>
                      <MenuItem value="Dr. Yohannes Assefa">Dr. Yohannes Assefa (Chief Q-Grader)</MenuItem>
                    </Select>
                    <FormHelperText>ECTA Quality Approval Authority</FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Quality Certificate Number"
                    value={approvalForm.certificateNo}
                    onChange={(e) => setApprovalForm({ ...approvalForm, certificateNo: e.target.value })}
                    helperText="Automatically generated certificate ID"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* STEP 3: Issue Export Permit */}
          {step === 'permit' && (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                <strong>Quality Approved!</strong> Certificate: {approvalForm.certificateNo}
              </Alert>

              <Typography variant="h6" gutterBottom>
                Export Permit Issuance
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Export Permit Number"
                    value={permitForm.exportPermitNo}
                    onChange={(e) => setPermitForm({ ...permitForm, exportPermitNo: e.target.value })}
                    helperText="Format: EP-YYYYMMDD-XXX"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Issued By *</InputLabel>
                    <Select
                      value={permitForm.issuedBy}
                      onChange={(e) => setPermitForm({ ...permitForm, issuedBy: e.target.value })}
                      label="Issued By *"
                    >
                      <MenuItem value="Ato Alemayehu Tadesse">Ato Alemayehu Tadesse (Permit Officer)</MenuItem>
                      <MenuItem value="W/ro Tsion Gebre">W/ro Tsion Gebre (Export Coordinator)</MenuItem>
                      <MenuItem value="Ato Dawit Hailu">Ato Dawit Hailu (Senior Inspector)</MenuItem>
                      <MenuItem value="W/ro Meron Worku">W/ro Meron Worku (Trade Facilitator)</MenuItem>
                    </Select>
                    <FormHelperText>ECTA Export Permit Authority</FormHelperText>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AnimatedButton onClick={onClose} disabled={loading}>
            Cancel
          </AnimatedButton>

          {step === 'perform' && (
            <AnimatedButton
              variant="contained"
              onClick={handlePerformInspection}
              disabled={loading || !inspectionForm.inspectorName}
              startIcon={<Assignment />}
              brandColor="#2e7d32"
            >
              Complete Inspection
            </AnimatedButton>
          )}

          {step === 'approve' && (
            <AnimatedButton
              variant="contained"
              onClick={handleApproveInspection}
              disabled={loading || !approvalForm.approvedBy}
              startIcon={<CheckCircle />}
              brandColor="#1976d2"
            >
              Approve Quality
            </AnimatedButton>
          )}

          {step === 'permit' && (
            <AnimatedButton
              variant="contained"
              onClick={handleIssuePermit}
              disabled={loading || !permitForm.issuedBy}
              startIcon={<Science />}
              brandColor="#ed6c02"
            >
              Issue Export Permit
            </AnimatedButton>
          )}
        </DialogActions>
      </Dialog>

      <NotificationDialog
        open={notification.open}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={closeNotification}
      />
    </>
  );
};
