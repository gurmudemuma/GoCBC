// Discrepancy Reporting Dialog
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, Typography, TextField, MenuItem, Divider, IconButton, CircularProgress, Alert } from '@mui/material';
import { Close, Warning, Send } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';

const CBE_COLORS = { purple: '#9b30b7', warning: '#f57c00', error: '#d32f2f' };

interface DiscrepancyReportingDialogProps { open: boolean; onClose: () => void; lcId: string; onSuccess: () => void; }

const DiscrepancyReportingDialog: React.FC<DiscrepancyReportingDialogProps> = ({ open, onClose, lcId, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ discrepancyId: `DISC${Date.now()}`, lcId: lcId || '', discrepancyType: 'Document Missing', severity: 'MAJOR', description: '', affectedDocument: '', affectedClauses: '', recommendedAction: 'Request Amendment' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.lcId) e.lcId = 'LC ID required';
    if (!form.discrepancyType) e.discrepancyType = 'Type required';
    if (!form.description) e.description = 'Description required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      const response = await apiFetch(`/api/v1/banking/lc/${form.lcId}/discrepancy/report`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(form) });
      const result = await response.json();
      if (result.success) { showSuccess('Discrepancy reported successfully'); onSuccess(); onClose(); }
      else showError(result.error || 'Failed');
    } catch (error) { showError('Failed to report discrepancy'); } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Warning sx={{ color: CBE_COLORS.warning }} />
          <Box><Typography variant="h6" fontWeight={600}>Report LC Discrepancy</Typography></Box>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>Document discrepancies must be reported within 5 banking days of presentation</Alert>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Discrepancy ID" value={form.discrepancyId} disabled /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="LC ID *" value={form.lcId} onChange={(e) => setForm({...form, lcId: e.target.value})} error={!!errors.lcId} helperText={errors.lcId} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Discrepancy Type *" value={form.discrepancyType} onChange={(e) => setForm({...form, discrepancyType: e.target.value})}>
            <MenuItem value="Document Missing">Document Missing</MenuItem>
            <MenuItem value="Incorrect Details">Incorrect Details</MenuItem>
            <MenuItem value="Expired Document">Expired Document</MenuItem>
            <MenuItem value="Late Presentation">Late Presentation</MenuItem>
            <MenuItem value="Amount Mismatch">Amount Mismatch</MenuItem>
            <MenuItem value="Date Discrepancy">Date Discrepancy</MenuItem>
            <MenuItem value="Description Error">Description Error</MenuItem>
          </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Severity *" value={form.severity} onChange={(e) => setForm({...form, severity: e.target.value})}>
            <MenuItem value="MINOR">Minor - Can be waived</MenuItem>
            <MenuItem value="MAJOR">Major - Requires correction</MenuItem>
            <MenuItem value="CRITICAL">Critical - Payment blocking</MenuItem>
          </TextField></Grid>
          <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Description *" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} error={!!errors.description} helperText={errors.description} placeholder="Detailed description of the discrepancy..." /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Affected Document" value={form.affectedDocument} onChange={(e) => setForm({...form, affectedDocument: e.target.value})} placeholder="e.g., Bill of Lading, Commercial Invoice" /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Affected LC Clauses" value={form.affectedClauses} onChange={(e) => setForm({...form, affectedClauses: e.target.value})} placeholder="e.g., Clause 5.2, Article 14" /></Grid>
          <Grid item xs={12}><TextField fullWidth select label="Recommended Action" value={form.recommendedAction} onChange={(e) => setForm({...form, recommendedAction: e.target.value})}>
            <MenuItem value="Accept with Waiver">Accept with Waiver</MenuItem>
            <MenuItem value="Request Amendment">Request Amendment</MenuItem>
            <MenuItem value="Request Document Correction">Request Document Correction</MenuItem>
            <MenuItem value="Reject Documents">Reject Documents</MenuItem>
          </TextField></Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : <Send />} sx={{ bgcolor: CBE_COLORS.warning }}>
          {submitting ? 'Reporting...' : 'Report Discrepancy'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiscrepancyReportingDialog;
