// Clearance Decision Dialog
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, Typography, TextField, Divider, IconButton, CircularProgress, Alert, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { Close, CheckCircle, Cancel, Send } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';

const CUSTOMS_COLORS = { navy: '#1565c0', success: '#4caf50', error: '#d32f2f' };

interface ClearanceDecisionDialogProps { open: boolean; onClose: () => void; crossing: any; onSuccess: () => void; }

const ClearanceDecisionDialog: React.FC<ClearanceDecisionDialogProps> = ({ open, onClose, crossing, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<'CLEAR' | 'DETAIN'>('CLEAR');
  const [form, setForm] = useState({ clearanceOfficer: '', certificateNumber: '', detentionReason: '', nextSteps: '' });

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const endpoint = decision === 'CLEAR' ? 'clear' : 'detain';
      const response = await apiFetch(`/api/v1/bordercrossing/${crossing.borderCrossingId}/${endpoint}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(form) });
      const result = await response.json();
      if (result.success) { showSuccess(decision === 'CLEAR' ? 'Shipment cleared successfully' : 'Shipment detained'); onSuccess(); onClose(); }
      else showError(result.error || 'Failed');
    } catch (error) { showError('Failed to process decision'); } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {decision === 'CLEAR' ? <CheckCircle sx={{ color: CUSTOMS_COLORS.success }} /> : <Cancel sx={{ color: CUSTOMS_COLORS.error }} />}
          <Box><Typography variant="h6" fontWeight={600}>Clearance Decision</Typography><Typography variant="caption">{crossing.borderCrossingId}</Typography></Box>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>Review all inspection results before making clearance decision</Alert>
        
        <RadioGroup value={decision} onChange={(e) => setDecision(e.target.value as 'CLEAR' | 'DETAIN')}>
          <FormControlLabel value="CLEAR" control={<Radio />} label={<Typography fontWeight={600}>Clear Shipment - Allow to proceed</Typography>} />
          <FormControlLabel value="DETAIN" control={<Radio />} label={<Typography fontWeight={600}>Detain Shipment - Hold for further action</Typography>} />
        </RadioGroup>

        <Divider sx={{ my: 3 }} />

        {decision === 'CLEAR' ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Clearance Officer" value={form.clearanceOfficer} onChange={(e) => setForm({...form, clearanceOfficer: e.target.value})} placeholder="Officer name" /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Clearance Certificate #" value={form.certificateNumber} onChange={(e) => setForm({...form, certificateNumber: e.target.value})} placeholder="e.g., CL-2026-001" /></Grid>
            <Grid item xs={12}><Alert severity="success" icon={<CheckCircle />}>Shipment will be cleared for export</Alert></Grid>
          </Grid>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Detention Reason *" value={form.detentionReason} onChange={(e) => setForm({...form, detentionReason: e.target.value})} placeholder="Explain reason for detention..." /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Next Steps" value={form.nextSteps} onChange={(e) => setForm({...form, nextSteps: e.target.value})} placeholder="What actions are required..." /></Grid>
            <Grid item xs={12}><Alert severity="error" icon={<Cancel />}>Shipment will be detained for further investigation</Alert></Grid>
          </Grid>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : <Send />} sx={{ bgcolor: decision === 'CLEAR' ? CUSTOMS_COLORS.success : CUSTOMS_COLORS.error }}>
          {submitting ? 'Processing...' : decision === 'CLEAR' ? 'Clear Shipment' : 'Detain Shipment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClearanceDecisionDialog;
