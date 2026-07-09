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
  DirectionsBoat,
  FlightTakeoff,
} from '@mui/icons-material';
import { AnimatedButton } from '@/components/modern';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import { useNotification } from '@/hooks/useNotification';
import api from '@/utils/api';

// Transport Mode Type
type TransportMode = 'SEA' | 'AIR';

// Default Transport Mode
const DEFAULT_TRANSPORT_MODE: TransportMode = 'SEA';

interface QualityInspectionWorkflowProps {
  shipment: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface InspectionFormData {
  inspectorName: string;
  transportMode: TransportMode;
  sampleSize: string;
  moistureContent: string;
  defectCount: string;
  beanSize: string;
  color: string;
  odor: string;
  fragrance: string;
  flavor: string;
  aftertaste: string;
  acidity: string;
  body: string;
  balance: string;
  uniformity: string;
  cleanCup: string;
  sweetness: string;
  overall: string;
  classification: string;
  pesticideTest: string;
  heavyMetalTest: string;
  mycotoxinTest: string;
  remarks: string;
}

export const QualityInspectionWorkflow: React.FC<QualityInspectionWorkflowProps> = ({
  shipment,
  onClose,
  onSuccess,
}) => {
  const { notification, showSuccess, showError, showWarning, closeNotification } = useNotification();
  const [step, setStep] = useState<'perform' | 'done'>('perform');
  const [loading, setLoading] = useState(false);
  const [inspectionData, setInspectionData] = useState<any>(null);
  const [exporterTaster, setExporterTaster] = useState<string>('');
  const [loadingExporter, setLoadingExporter] = useState(true);

  // Perform Inspection Form Data
  const [inspectionForm, setInspectionForm] = useState<InspectionFormData>({
    inspectorName: '',
    transportMode: DEFAULT_TRANSPORT_MODE,
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

  // Note: Approve/Reject/Permit handling moved to InspectionManagement component

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
          'Inspection Recorded',
          `Physical & cupping inspection completed for ${shipment.shipmentId}. Score: ${calculateTotalScore()}/100 — ${getQualityGrade()}`,
          'The inspection record is now on the blockchain. Go to the Quality Control tab → All Inspections to Approve or Reject this inspection and then issue the Export Permit.'
        );
        setStep('done');
      } else {
        showError('Inspection Failed', response.data?.error?.message || 'Failed to perform inspection');
      }
    } catch (error: any) {
      showError('Inspection Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Note: Approve/Reject/Permit handlers moved to InspectionManagement component

  const calculateTotalScore = () => {
    const scores = [
      'fragrance', 'flavor', 'aftertaste', 'acidity', 'body',
      'balance', 'uniformity', 'cleanCup', 'sweetness', 'overall',
    ] as const;
    return scores.reduce((sum, key) => sum + parseFloat(inspectionForm[key] || '0'), 0);
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
              label={
                step === 'perform' ? 'Step 1 of 3: Perform Physical & Cupping Inspection' :
                'Step 1 Complete — Proceed to Quality Control tab for approval'
              }
              color={step === 'done' ? 'success' : 'primary'}
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

                {/* Transport Mode Selector */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Intended Transport Mode</InputLabel>
                    <Select
                      value={inspectionForm.transportMode || 'SEA'}
                      onChange={(e) => setInspectionForm({
                        ...inspectionForm, 
                        transportMode: e.target.value as TransportMode
                      })}
                      label="Intended Transport Mode"
                    >
                      <MenuItem value="SEA">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DirectionsBoat /> Sea Freight (Bulk Commercial)
                        </Box>
                      </MenuItem>
                      <MenuItem value="AIR">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FlightTakeoff /> Air Freight (Premium Specialty)
                        </Box>
                      </MenuItem>
                    </Select>
                    <FormHelperText>
                      Transport method affects packaging requirements and quality standards
                    </FormHelperText>
                  </FormControl>
                </Grid>

                {/* Air Freight Quality Standards Alert */}
                {inspectionForm.transportMode === 'AIR' && (
                  <Grid item xs={12} md={6}>
                    <Alert severity="info" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">
                        <strong>Air Freight Quality Standards:</strong> Premium specialty coffee. 
                        Ensure packaging meets airline cargo requirements and maintains freshness 
                        for rapid transit (1-3 days).
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                
                {inspectionForm.transportMode === 'SEA' && (
                  <Grid item xs={12} md={6}>
                    <Alert severity="info" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">
                        <strong>Sea Freight Packaging:</strong> Bulk commercial grade. 
                        Standard packaging for long transit (25-35 days). Moisture protection required.
                      </Typography>
                    </Alert>
                  </Grid>
                )}

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

          {/* STEP COMPLETE: Next steps in Quality Control tab */}
          {step === 'done' && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                <strong>✅ Inspection Recorded on Blockchain!</strong>
                <br />
                Shipment: {shipment.shipmentId} • Total Score: {calculateTotalScore()}/100 • Grade: {getQualityGrade()}
                <br />
                {inspectionData?.inspectionId && `Inspection ID: ${inspectionData.inspectionId}`}
              </Alert>
              
              <Typography variant="h6" gutterBottom>
                📋 What's Next?
              </Typography>
              <Typography variant="body1" align="left" sx={{ maxWidth: 600, mx: 'auto', mb: 2 }}>
                The inspection is now recorded on the blockchain. To complete the quality control workflow:
              </Typography>
              
              <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'left', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Typography variant="body2" paragraph>
                  <strong>Step 1:</strong> Navigate to the <strong>Quality Control</strong> tab in the ECTA portal
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Step 2:</strong> Find this inspection in the <strong>All Inspections</strong> table
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Step 3:</strong> Review and click <strong>✓ Approve</strong> (if quality passed) or <strong>✗ Reject</strong> (if failed)
                </Typography>
                <Typography variant="body2">
                  <strong>Step 4:</strong> After approval, click <strong>Issue Permit</strong> to generate the Export Permit
                </Typography>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
                The 3-step approval workflow (Perform → Approve → Permit) is separated for professional auditability. 
                Each action is logged independently on the blockchain with proper stakeholder authentication.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {step === 'perform' && (
            <>
              <AnimatedButton onClick={onClose} disabled={loading}>
                Cancel
              </AnimatedButton>
              <AnimatedButton
                variant="contained"
                onClick={handlePerformInspection}
                disabled={loading || !inspectionForm.inspectorName}
                startIcon={<Assignment />}
                brandColor="#2e7d32"
              >
                Complete Inspection
              </AnimatedButton>
            </>
          )}

          {step === 'done' && (
            <AnimatedButton
              variant="contained"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              brandColor="#1976d2"
            >
              Got It - Go to Quality Control Tab
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
