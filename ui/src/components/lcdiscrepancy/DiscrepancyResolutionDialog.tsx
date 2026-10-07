// Discrepancy Resolution Dialog
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, Typography, TextField, MenuItem, Divider, IconButton, CircularProgress, Alert, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { Close, CheckCircle, Send } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';

const CBE_COLORS = { purple: '#9b30b7', success: '#4caf50' };

interface DiscrepancyResolutionDialogProps { open: boolean; onClose: () => void; discrepancy: any; onSuccess: () => void; }

const DiscrepancyResolutionDialog: React.FC<DiscrepancyResolutionDialogProps> = ({ open, onClose, discrepancy, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [resolutionMethod, setResolutionMethod] = useState<'waiver' | 'amendment' | 'correction' | 'reject'>('waiver');
  const [form, setForm] = useState({ resolutionNotes: '', waiverApproval: '', amendmentDetails: '', correctionRequired: '' });

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const response = await apiFetch(`/api/v1/banking/discrepancy/${discrepancy.discrepancyId}/resolve`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ resolutionMethod, ...form }) });
      const result = await response.json();
      if (result.success) { showSuccess('Discrepancy resolved successfully'); onSuccess(); onClose(); }
      else showError(result.error || 'Failed');
    } catch (error) { showError('Failed to resolve discrepancy'); } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CheckCircle sx={{ color: CBE_COLORS.success }} />
          <Box><Typography variant="h6" fontWeight={600}>Resolve Discrepancy</Typography><Typography variant="caption">{discrepancy.discrepancyId}</Typography></Box>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>Select resolution method and provide necessary details</Alert>

        <RadioGroup value={resolutionMethod} onChange={(e) => setResolutionMethod(e.target.value as any)}>
          <FormControlLabel value="waiver" control={<Radio />} label={<Typography fontWeight={600}>Accept with Waiver - Buyer accepts discrepancy</Typography>} />
          <FormControlLabel value="amendment" control={<Radio />} label={<Typography fontWeight={600}>Request LC Amendment - Modify LC terms</Typography>} />
          <FormControlLabel value="correction" control={<Radio />} label={<Typography fontWeight={600}>Request Document Correction - Resubmit corrected docs</Typography>} />
          <FormControlLabel value="reject" control={<Radio />} label={<Typography fontWeight={600}>Reject Documents - Refuse payment</Typography>} />
        </RadioGroup>

        <Divider sx={{ my: 3 }} />

        {resolutionMethod === 'waiver' && (
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Waiver Approval Reference" value={form.waiverApproval} onChange={(e) => setForm({...form, waiverApproval: e.target.value})} placeholder="Buyer's waiver approval reference" /></Grid>
            <Grid item xs={12}><Alert severity="success">Discrepancy will be waived and payment will proceed</Alert></Grid>
          </Grid>
        )}

        {resolutionMethod === 'amendment' && (
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Amendment Details" value={form.amendmentDetails} onChange={(e) => setForm({...form, amendmentDetails: e.target.value})} placeholder="Specify what needs to be amended in the LC..." /></Grid>
            <Grid item xs={12}><Alert severity="info">LC amendment process will be initiated</Alert></Grid>
          </Grid>
        )}

        {resolutionMethod === 'correction' && (
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Correction Required" value={form.correctionRequired} onChange={(e) => setForm({...form, correctionRequired: e.target.value})} placeholder="Specify what documents need correction..." /></Grid>
            <Grid item xs={12}><Alert severity="warning">Exporter will be notified to resubmit corrected documents</Alert></Grid>
          </Grid>
        )}

        {resolutionMethod === 'reject' && (
          <Grid container spacing={2}>
            <Grid item xs={12}><Alert severity="error">Documents will be rejected and payment will not be released</Alert></Grid>
          </Grid>
        )}

        <TextField fullWidth multiline rows={3} label="Resolution Notes" value={form.resolutionNotes} onChange={(e) => setForm({...form, resolutionNotes: e.target.value})} placeholder="Add any additional notes..." sx={{ mt: 3 }} />
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : <Send />} sx={{ bgcolor: CBE_COLORS.success }}>
          {submitting ? 'Processing...' : 'Resolve Discrepancy'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiscrepancyResolutionDialog;
