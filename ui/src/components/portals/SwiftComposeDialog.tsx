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
  // LEG3 M-2: documents to attach at creation (comma-separated in the
  // dialog, stored as an array). The API forwards them to
  // AddSWIFTDocuments; they can also be attached later via
  // POST /swift/messages/:id/documents.
  documents: string[];
}

interface Props {
  open: boolean;
  form: SwiftForm;
  onChange: (f: SwiftForm) => void;
  onClose: () => void;
  onConfirm: (f: SwiftForm) => Promise<void> | void;
}

const SwiftComposeDialog: React.FC<Props> = ({ open, form, onChange, onClose, onConfirm }) => {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // LEG3 M-6: the dialog used to accept anything and let the API 422/400
  // after the fact — and the caller closed the dialog either way, losing
  // the form. Validate here: receiverBIC is required by the API
  // (swift.ts), amount must be > 0 (a blank amount was sent as 0), and
  // MT700 requires an LC expiry date (swift.ts /messages/mt700).
  const validate = (f: SwiftForm): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!f.receiverBIC || !f.receiverBIC.trim()) e.receiverBIC = 'Receiver BIC is required';
    if (f.amount === '' || f.amount === null || f.amount === undefined || Number(f.amount) <= 0) e.amount = 'Amount must be greater than 0';
    if (f.messageType === 'MT700' && !f.lcExpiryDate) e.lcExpiryDate = 'LC Expiry Date is required for MT700';
    return e;
  };

  const handleCreate = async () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    await onConfirm(form);
  };

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
          <TextField label="Receiver BIC *" size="small" value={form.receiverBIC} onChange={(e) => onChange({ ...form, receiverBIC: e.target.value })} error={Boolean(errors.receiverBIC)} helperText={errors.receiverBIC} />
          <TextField label="Amount *" size="small" type="number" value={form.amount} onChange={(e) => onChange({ ...form, amount: e.target.value })} error={Boolean(errors.amount)} helperText={errors.amount} />
          <TextField label="Currency" size="small" value={form.currency} onChange={(e) => onChange({ ...form, currency: e.target.value })} />
          <TextField label="Value Date" size="small" type="date" value={form.valueDate ? form.valueDate.split('T')[0] : ''} onChange={(e) => onChange({ ...form, valueDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Applicant" size="small" value={form.applicant} onChange={(e) => onChange({ ...form, applicant: e.target.value })} />
          <TextField label="Beneficiary" size="small" value={form.beneficiary} onChange={(e) => onChange({ ...form, beneficiary: e.target.value })} />
          <TextField label="Linked LC ID" size="small" value={form.linkedLcId} onChange={(e) => onChange({ ...form, linkedLcId: e.target.value })} />
          <TextField label="Linked Payment ID" size="small" value={form.linkedPaymentId} onChange={(e) => onChange({ ...form, linkedPaymentId: e.target.value })} />
          <TextField label="LC Expiry Date" size="small" type="date" value={form.lcExpiryDate ? form.lcExpiryDate.split('T')[0] : ''} onChange={(e) => onChange({ ...form, lcExpiryDate: e.target.value })} InputLabelProps={{ shrink: true }} error={Boolean(errors.lcExpiryDate)} helperText={errors.lcExpiryDate || (form.messageType === 'MT700' ? 'Required for MT700' : undefined)} />
          <TextField label="Remittance Info" size="small" value={form.remittanceInfo} onChange={(e) => onChange({ ...form, remittanceInfo: e.target.value })} fullWidth multiline rows={2} sx={{ gridColumn: '1 / -1' }} />
          <TextField label="Attach Documents (comma-separated names or IDs)" size="small" value={(form.documents || []).join(', ')} onChange={(e) => onChange({ ...form, documents: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} fullWidth helperText="Optional — attached at creation. Documents can also be attached later to a DRAFT message." sx={{ gridColumn: '1 / -1' }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: '#9b30b7', '&:hover': { bgcolor: '#7a2592' } }}>Create Message</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SwiftComposeDialog;
