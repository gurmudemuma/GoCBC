// Border Crossing Initiation Dialog
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, Typography, TextField, Divider, IconButton, CircularProgress } from '@mui/material';
import { Close, LocalShipping, Send } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';

const CUSTOMS_COLORS = { navy: '#1565c0' };

interface BorderCrossingInitiationDialogProps { open: boolean; onClose: () => void; onSuccess: () => void; }

const BorderCrossingInitiationDialog: React.FC<BorderCrossingInitiationDialogProps> = ({ open, onClose, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ borderCrossingId: `BC${Date.now()}`, shipmentId: '', vehicleNumber: '', driverName: '', driverLicense: '', borderPost: 'Moyale', arrivalTime: new Date().toISOString().slice(0, 16), notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.shipmentId) e.shipmentId = 'Shipment ID required';
    if (!form.vehicleNumber) e.vehicleNumber = 'Vehicle number required';
    if (!form.driverName) e.driverName = 'Driver name required';
    if (!form.borderPost) e.borderPost = 'Border post required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      const response = await apiFetch('/api/v1/bordercrossing/initiate', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(form) });
      const result = await response.json();
      if (result.success) { showSuccess('Border crossing initiated'); onSuccess(); onClose(); setForm({ ...form, borderCrossingId: `BC${Date.now()}` }); }
      else showError(result.error || 'Failed');
    } catch (error) { showError('Failed to initiate'); } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LocalShipping sx={{ color: CUSTOMS_COLORS.navy }} />
          <Box><Typography variant="h6" fontWeight={600}>Initiate Border Crossing</Typography></Box>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Crossing ID" value={form.borderCrossingId} disabled /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Shipment ID *" value={form.shipmentId} onChange={(e) => setForm({...form, shipmentId: e.target.value})} error={!!errors.shipmentId} helperText={errors.shipmentId} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Vehicle Number *" value={form.vehicleNumber} onChange={(e) => setForm({...form, vehicleNumber: e.target.value})} error={!!errors.vehicleNumber} helperText={errors.vehicleNumber} placeholder="e.g., ET-3-12345" /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Driver Name *" value={form.driverName} onChange={(e) => setForm({...form, driverName: e.target.value})} error={!!errors.driverName} helperText={errors.driverName} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Driver License" value={form.driverLicense} onChange={(e) => setForm({...form, driverLicense: e.target.value})} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Border Post *" value={form.borderPost} onChange={(e) => setForm({...form, borderPost: e.target.value})} error={!!errors.borderPost}>
            <option value="Moyale">Moyale (Kenya)</option>
            <option value="Metema">Metema (Sudan)</option>
            <option value="Galafi">Galafi (Djibouti)</option>
          </TextField></Grid>
          <Grid item xs={12}><TextField fullWidth type="datetime-local" label="Arrival Time" value={form.arrivalTime} onChange={(e) => setForm({...form, arrivalTime: e.target.value})} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : <Send />} sx={{ bgcolor: CUSTOMS_COLORS.navy }}>
          {submitting ? 'Submitting...' : 'Initiate Crossing'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BorderCrossingInitiationDialog;
