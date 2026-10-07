// Physical Inspection Dialog
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, Typography, TextField, Divider, IconButton, CircularProgress, FormControlLabel, Checkbox } from '@mui/material';
import { Close, Assessment, Send, CameraAlt } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';

const CUSTOMS_COLORS = { navy: '#1565c0' };

interface PhysicalInspectionDialogProps { open: boolean; onClose: () => void; crossing: any; onSuccess: () => void; }

const PhysicalInspectionDialog: React.FC<PhysicalInspectionDialogProps> = ({ open, onClose, crossing, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ sealIntact: true, containerCondition: 'Good', quantityMatch: true, discrepancies: '', gpsCoordinates: '', findings: '' });

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const response = await apiFetch(`/api/v1/bordercrossing/${crossing.borderCrossingId}/inspect`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(form) });
      const result = await response.json();
      if (result.success) { showSuccess('Physical inspection completed'); onSuccess(); onClose(); }
      else showError(result.error || 'Failed');
    } catch (error) { showError('Failed to record inspection'); } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assessment sx={{ color: CUSTOMS_COLORS.navy }} />
          <Box><Typography variant="h6" fontWeight={600}>Physical Inspection</Typography><Typography variant="caption">{crossing.borderCrossingId}</Typography></Box>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={form.sealIntact} onChange={(e) => setForm({...form, sealIntact: e.target.checked})} />} label="Seal Intact" /></Grid>
          <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={form.quantityMatch} onChange={(e) => setForm({...form, quantityMatch: e.target.checked})} />} label="Quantity Matches Manifest" /></Grid>
          <Grid item xs={12}><TextField fullWidth select label="Container Condition" value={form.containerCondition} onChange={(e) => setForm({...form, containerCondition: e.target.value})}>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor - Damaged</option>
          </TextField></Grid>
          <Grid item xs={12}><TextField fullWidth label="GPS Coordinates" value={form.gpsCoordinates} onChange={(e) => setForm({...form, gpsCoordinates: e.target.value})} placeholder="e.g., 3.5186° N, 39.0575° E" /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Discrepancies (if any)" value={form.discrepancies} onChange={(e) => setForm({...form, discrepancies: e.target.value})} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Inspection Findings" value={form.findings} onChange={(e) => setForm({...form, findings: e.target.value})} placeholder="Record detailed inspection observations..." /></Grid>
          <Grid item xs={12}><Button startIcon={<CameraAlt />} variant="outlined">Upload Photos</Button></Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : <Send />} sx={{ bgcolor: CUSTOMS_COLORS.navy }}>
          {submitting ? 'Saving...' : 'Complete Inspection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PhysicalInspectionDialog;
