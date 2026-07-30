import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, TextField, MenuItem } from '@mui/material';

interface SwiftForm {
  messageID: string;
  messageType: string;
  swiftReference: string;
  senderBIC: string;
  receiverBIC: string;
  amount: any;
  currency: string;
  valueDate: string;
  beneficiary: string;
  remittanceInfo: string;
  linkedLcId: string;
  linkedPaymentId: string;
  applicant: string;
  lcExpiryDate: string;
}

interface Props {
  open: boolean;
  form: SwiftForm;
  onChange: (f: SwiftForm) => void;
  onClose: () => void;
  onConfirm: (f: SwiftForm) => Promise<void> | void;
}

const SwiftComposeDialog: React.FC<Props> = ({ open, form, onChange, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Compose SWIFT Message</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
          <TextField label="Message ID" size="small" value={form.messageID} onChange={(e) => onChange({ ...form, messageID: e.target.value })} />
          <TextField select label="Message Type" size="small" value={form.messageType} onChange={(e) => onChange({ ...form, messageType: e.target.value })}>
            <MenuItem value="MT103">MT103 (Payment)</MenuItem>
            <MenuItem value="MT700">MT700 (Issue LC)</MenuItem>
            <MenuItem value="MT750">MT750 (Discrepancy)</MenuItem>
          </TextField>
          <TextField label="SWIFT Reference" size="small" value={form.swiftReference} onChange={(e) => onChange({ ...form, swiftReference: e.target.value })} />
          <TextField label="Sender BIC" size="small" value={form.senderBIC} onChange={(e) => onChange({ ...form, senderBIC: e.target.value })} />
          <TextField label="Receiver BIC" size="small" value={form.receiverBIC} onChange={(e) => onChange({ ...form, receiverBIC: e.target.value })} />
          <TextField label="Amount" size="small" type="number" value={form.amount} onChange={(e) => onChange({ ...form, amount: e.target.value })} />
          <TextField label="Currency" size="small" value={form.currency} onChange={(e) => onChange({ ...form, currency: e.target.value })} />
          <TextField label="Value Date" size="small" type="date" value={form.valueDate ? form.valueDate.split('T')[0] : ''} onChange={(e) => onChange({ ...form, valueDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Applicant" size="small" value={form.applicant} onChange={(e) => onChange({ ...form, applicant: e.target.value })} />
          <TextField label="Beneficiary" size="small" value={form.beneficiary} onChange={(e) => onChange({ ...form, beneficiary: e.target.value })} />
          <TextField label="Linked LC ID" size="small" value={form.linkedLcId} onChange={(e) => onChange({ ...form, linkedLcId: e.target.value })} />
          <TextField label="Linked Payment ID" size="small" value={form.linkedPaymentId} onChange={(e) => onChange({ ...form, linkedPaymentId: e.target.value })} />
          <TextField label="LC Expiry Date" size="small" type="date" value={form.lcExpiryDate ? form.lcExpiryDate.split('T')[0] : ''} onChange={(e) => onChange({ ...form, lcExpiryDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Remittance Info" size="small" value={form.remittanceInfo} onChange={(e) => onChange({ ...form, remittanceInfo: e.target.value })} fullWidth multiline rows={2} sx={{ gridColumn: '1 / -1' }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={async () => await onConfirm(form)} sx={{ bgcolor: '#9b30b7', '&:hover': { bgcolor: '#7a2592' } }}>Send</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SwiftComposeDialog;
