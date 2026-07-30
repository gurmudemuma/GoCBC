import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, TextField } from '@mui/material';

interface AllocationForm {
  forexId: string;
  lcId: string;
  amount: number;
  exchangeRate: number;
  retentionRate: number;
  officer: string;
  approvalRef: string;
  expiryDate: string;
}

interface Props {
  open: boolean;
  form: AllocationForm;
  onChange: (f: AllocationForm) => void;
  onClose: () => void;
  onConfirm: (f: AllocationForm) => Promise<void> | void;
}

const ForexAllocationDialog: React.FC<Props> = ({ open, form, onChange, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Allocate Forex</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Forex ID" size="small" value={form.forexId} disabled />
          <TextField label="LC Reference" size="small" value={form.lcId} onChange={(e) => onChange({ ...form, lcId: e.target.value })} />
          <TextField label="Amount (USD)" size="small" type="number" value={form.amount} onChange={(e) => onChange({ ...form, amount: Number(e.target.value) })} />
          <TextField label="Exchange Rate (ETB/USD)" size="small" type="number" value={form.exchangeRate} onChange={(e) => onChange({ ...form, exchangeRate: Number(e.target.value) })} />
          <TextField label="Retention Rate (%)" size="small" type="number" value={form.retentionRate} onChange={(e) => onChange({ ...form, retentionRate: Number(e.target.value) })} />
          <TextField label="Officer" size="small" value={form.officer} onChange={(e) => onChange({ ...form, officer: e.target.value })} />
          <TextField label="Approval Ref" size="small" value={form.approvalRef} onChange={(e) => onChange({ ...form, approvalRef: e.target.value })} />
          <TextField label="Expiry Date" size="small" type="date" value={form.expiryDate ? form.expiryDate.split('T')[0] : ''} onChange={(e) => onChange({ ...form, expiryDate: new Date(e.target.value).toISOString() })} InputLabelProps={{ shrink: true }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={async () => await onConfirm(form)} sx={{ bgcolor: '#9b30b7', '&:hover': { bgcolor: '#7a2592' } }}>Allocate</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForexAllocationDialog;
