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
  const [resolutionMethod, setResolutionMethod] = useState<'waiver' | 'correction' | 'reject'>('correction');
  const [form, setForm] = useState({ resolutionNotes: '', waiverApproval: '', correctionRequired: '' });

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const lcId = discrepancy?.lcId;
      const discrepancyId = discrepancy?.discrepancyId;
      if (!lcId || !discrepancyId) {
        showError('Error', 'The LC reference is missing for this discrepancy');
        return;
      }

      let endpoint: string;
      let payload: Record<string, string>;
      if (resolutionMethod === 'waiver') {
        const waiverReason = [form.waiverApproval.trim() && `Waiver approval reference: ${form.waiverApproval.trim()}`, form.resolutionNotes.trim()].filter(Boolean).join('\n');
        if (waiverReason.length < 10) {
          showError('Validation', 'Provide the waiver approval reference or at least 10 characters of resolution notes');
          return;
        }
        endpoint = `/banking/lc/${encodeURIComponent(lcId)}/discrepancy/${encodeURIComponent(discrepancyId)}/waive`;
        payload = { waiverReason };
      } else if (resolutionMethod === 'reject') {
        const rejectionReason = form.resolutionNotes.trim();
        if (rejectionReason.length < 10) {
          showError('Validation', 'Provide at least 10 characters explaining why the documents are being rejected');
          return;
        }
        endpoint = `/banking/lc/${encodeURIComponent(lcId)}/documents/reject`;
        payload = { rejectionReason };
      } else {
        const resolution = form.correctionRequired.trim() || form.resolutionNotes.trim();
        if (resolution.length < 10) {
          showError('Validation', 'Describe how the corrected documents were reviewed in at least 10 characters');
          return;
        }
        endpoint = `/banking/lc/${encodeURIComponent(lcId)}/discrepancy/${encodeURIComponent(discrepancyId)}/resolve`;
        payload = { resolution };
      }

      const response = await apiFetch(endpoint, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      const result = await response.json();
      if (response.ok && result.success) { showSuccess('Success', 'Discrepancy action recorded on the consortium ledger'); onSuccess(); onClose(); }
      else showError('Error', result.error?.message || result.error || 'Failed to resolve discrepancy');
    } catch (error) { showError('Error', 'Failed to resolve discrepancy'); } finally { setSubmitting(false); }
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
          <FormControlLabel value="correction" control={<Radio />} label={<Typography fontWeight={600}>Confirm corrected documents were reviewed</Typography>} />
          <FormControlLabel value="waiver" control={<Radio />} label={<Typography fontWeight={600}>Accept with an authorized waiver</Typography>} />
          <FormControlLabel value="reject" control={<Radio />} label={<Typography fontWeight={600}>Reject the documents and stop payment</Typography>} />
        </RadioGroup>

        <Divider sx={{ my: 3 }} />

        {resolutionMethod === 'waiver' && (
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Waiver Approval Reference" value={form.waiverApproval} onChange={(e) => setForm({...form, waiverApproval: e.target.value})} placeholder="Authorized waiver approval reference" /></Grid>
            <Grid item xs={12}><Alert severity="success">Discrepancy will be waived and payment will proceed</Alert></Grid>
          </Grid>
        )}

        {resolutionMethod === 'correction' && (
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Correction Verification Details" value={form.correctionRequired} onChange={(e) => setForm({...form, correctionRequired: e.target.value})} placeholder="Record what was corrected and how it was checked..." /></Grid>
            <Grid item xs={12}><Alert severity="info">Only record resolution after corrected documents have been received and reviewed.</Alert></Grid>
          </Grid>
        )}

        {resolutionMethod === 'reject' && (
          <Grid container spacing={2}>
            <Grid item xs={12}><Alert severity="error">Rejecting documents moves the LC to a terminal state and prevents payment release.</Alert></Grid>
          </Grid>
        )}

        {resolutionMethod !== 'correction' && (
          <TextField fullWidth multiline rows={3} label={resolutionMethod === 'reject' ? 'Document Rejection Reason *' : 'Resolution Notes'} value={form.resolutionNotes} onChange={(e) => setForm({...form, resolutionNotes: e.target.value})} placeholder={resolutionMethod === 'reject' ? 'Explain the unresolved discrepancy and why payment must stop...' : 'Add the waiver decision and supporting notes...'} sx={{ mt: 3 }} />
        )}
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
