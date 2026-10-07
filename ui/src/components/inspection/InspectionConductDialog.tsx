// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Inspection Conduct Dialog - ECTA Portal
// Record inspection findings: quality grade, moisture, defects, samples

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  TextField,
  Divider,
  IconButton,
  CircularProgress,
  InputAdornment,
  Slider,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
} from '@mui/material';
import {
  Close,
  Science,
  CheckCircle,
  Send,
  CameraAlt,
  Assignment,
} from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';

const ECTA_COLORS = { green: '#2e7d32' };

interface InspectionConductDialogProps {
  open: boolean;
  onClose: () => void;
  inspection: any;
  onSuccess: () => void;
}

const InspectionConductDialog: React.FC<InspectionConductDialogProps> = ({
  open,
  onClose,
  inspection,
  onSuccess,
}) => {
  const { showSuccess, showError } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    qualityGrade: 'Grade 1',
    moistureContent: 12,
    defectPercentage: 0,
    foreignMatter: 0,
    screenSize: '',
    cupQuality: '',
    beanAppearance: 'Good',
    sampleBatchNumbers: '',
    sealNumbers: '',
    findings: '',
  });

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const response = await apiFetch(`/api/v1/inspection/${inspection.inspectionId}/conduct`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          qualityGrade: formData.qualityGrade,
          moistureContent: formData.moistureContent,
          defectPercentage: formData.defectPercentage,
          foreignMatter: formData.foreignMatter,
          findings: formData.findings,
        }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Inspection conducted successfully');
        onSuccess();
        onClose();
      } else {
        showError(result.error || 'Failed to record inspection');
      }
    } catch (error) {
      showError('Failed to conduct inspection');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Science sx={{ color: ECTA_COLORS.green }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>Conduct Inspection</Typography>
            <Typography variant="caption" color="text.secondary">{inspection.inspectionId}</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Quality Grade" value={formData.qualityGrade} onChange={(e) => setFormData({...formData, qualityGrade: e.target.value})}>
              <option value="Grade 1">Grade 1 - Premium</option>
              <option value="Grade 2">Grade 2 - Good</option>
              <option value="Grade 3">Grade 3 - Standard</option>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Screen Size" value={formData.screenSize} onChange={(e) => setFormData({...formData, screenSize: e.target.value})} placeholder="e.g., 15+" />
          </Grid>
          <Grid item xs={12}>
            <Typography gutterBottom>Moisture Content: {formData.moistureContent}%</Typography>
            <Slider value={formData.moistureContent} onChange={(e, v) => setFormData({...formData, moistureContent: v as number})} min={8} max={15} step={0.1} marks valueLabelDisplay="auto" />
          </Grid>
          <Grid item xs={12}>
            <Typography gutterBottom>Defect Percentage: {formData.defectPercentage}%</Typography>
            <Slider value={formData.defectPercentage} onChange={(e, v) => setFormData({...formData, defectPercentage: v as number})} min={0} max={10} step={0.1} valueLabelDisplay="auto" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={4} label="Findings & Observations" value={formData.findings} onChange={(e) => setFormData({...formData, findings: e.target.value})} placeholder="Record inspection findings..." />
          </Grid>
        </Grid>
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : <Send />} sx={{ bgcolor: ECTA_COLORS.green }}>
          {submitting ? 'Saving...' : 'Complete Inspection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InspectionConductDialog;
