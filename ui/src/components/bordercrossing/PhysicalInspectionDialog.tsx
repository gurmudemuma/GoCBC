// Physical Inspection Dialog
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, Typography, TextField, Divider, IconButton, CircularProgress, FormControlLabel, Checkbox, RadioGroup, Radio, MenuItem } from '@mui/material';
import { Close, Assessment, Send } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';
import { getPortalBrand } from '@/components/shared/portal';

const CUSTOMS_COLORS = { navy: getPortalBrand('CUSTOMS').primary };

interface PhysicalInspectionDialogProps { open: boolean; onClose: () => void; crossing: any; onSuccess: () => void; }

// Payload is exactly what POST /bordercrossing/:id/inspect reads
// (api/src/routes/bordercrossing.ts → RecordBorderInspection):
// inspectorName, inspectionDate, sealIntact, physicalCondition,
// documentationComplete, findings, passed. The old dialog sent
// containerCondition / quantityMatch / discrepancies / gpsCoordinates —
// none of them read by the route, and it never sent inspectorName,
// inspectionDate or passed, so the ledger note recorded an empty
// inspector and a defaulted pass. It also posted to
// /bordercrossing/undefined/inspect (borderCrossingId → crossingId).
const PhysicalInspectionDialog: React.FC<PhysicalInspectionDialogProps> = ({ open, onClose, crossing, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    inspectorName: '',
    inspectionDate: new Date().toISOString().slice(0, 16),
    sealIntact: true,
    physicalCondition: 'Good',
    documentationComplete: true,
    findings: '',
    passed: true,
  });
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.inspectorName.trim()) { setError('Inspector name is required'); return; }
    setError('');
    try {
      setSubmitting(true);
      const payload = {
        inspectorName: form.inspectorName,
        inspectionDate: new Date(form.inspectionDate).toISOString(),
        sealIntact: form.sealIntact,
        physicalCondition: form.physicalCondition,
        documentationComplete: form.documentationComplete,
        findings: form.findings,
        passed: form.passed,
      };
      const response = await apiFetch(`/bordercrossing/${crossing.crossingId}/inspect`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      const result = await response.json();
      if (result.success) { showSuccess('Success', form.passed ? 'Physical inspection completed — passed' : 'Physical inspection completed — failed'); onSuccess(); onClose(); }
      else showError('Error', result.error || 'Failed');
    } catch (error) { showError('Error', 'Failed to record inspection'); } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assessment sx={{ color: CUSTOMS_COLORS.navy }} />
          <Box><Typography variant="h6" fontWeight={600}>Physical Inspection</Typography><Typography variant="caption">{crossing.crossingId}</Typography></Box>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Inspector Name *" value={form.inspectorName} onChange={(e) => setForm({...form, inspectorName: e.target.value})} error={!!error} helperText={error} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth type="datetime-local" label="Inspection Date" value={form.inspectionDate} onChange={(e) => setForm({...form, inspectionDate: e.target.value})} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={form.sealIntact} onChange={(e) => setForm({...form, sealIntact: e.target.checked})} />} label="Seal Intact" /></Grid>
          <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={form.documentationComplete} onChange={(e) => setForm({...form, documentationComplete: e.target.checked})} />} label="Documentation Complete" /></Grid>
          <Grid item xs={12}><TextField fullWidth select label="Physical Condition" value={form.physicalCondition} onChange={(e) => setForm({...form, physicalCondition: e.target.value})}>
            <MenuItem value="Excellent">Excellent</MenuItem>
            <MenuItem value="Good">Good</MenuItem>
            <MenuItem value="Fair">Fair</MenuItem>
            <MenuItem value="Poor">Poor - Damaged</MenuItem>
          </TextField></Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>Inspection Outcome</Typography>
            <RadioGroup row value={form.passed ? 'PASSED' : 'FAILED'} onChange={(e) => setForm({...form, passed: e.target.value === 'PASSED'})}>
              <FormControlLabel value="PASSED" control={<Radio />} label="Passed" />
              <FormControlLabel value="FAILED" control={<Radio />} label="Failed" />
            </RadioGroup>
            <Typography variant="caption" color="textSecondary">A failed inspection sets the crossing to INSPECTION_FAILED; it can be re-inspected afterwards (chaincode §14).</Typography>
          </Grid>
          <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Inspection Findings" value={form.findings} onChange={(e) => setForm({...form, findings: e.target.value})} placeholder="Record detailed inspection observations..." /></Grid>
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
