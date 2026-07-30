// Payment Release Panel for Banks
// Final step in LC workflow - Release funds via SWIFT

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Grid,
  Divider,
  TextField,
  Checkbox,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Payment,
  CheckCircle,
  Warning,
  AttachMoney,
} from '@mui/icons-material';

interface PaymentReleasePanelProps {
  open: boolean;
  lc: any;
  onClose: () => void;
  onRelease: (lcId: string, swiftDetails: any) => void;
}

export const PaymentReleasePanel: React.FC<PaymentReleasePanelProps> = ({
  open,
  lc,
  onClose,
  onRelease,
}) => {
  const [confirmations, setConfirmations] = useState({
    documentsVerified: false,
    amountConfirmed: false,
    beneficiaryConfirmed: false,
    swiftReady: false,
  });
  const [paymentReference, setPaymentReference] = useState('');
  const [bankComments, setBankComments] = useState('');

  const allConfirmed = Object.values(confirmations).every(v => v);

  const handleRelease = () => {
    if (!allConfirmed) {
      alert('Please confirm all checks before releasing payment.');
      return;
    }
    if (!paymentReference.trim()) {
      alert('Payment reference is required.');
      return;
    }

    const swiftDetails = {
      paymentReference,
      swiftMessage: generateSWIFTMessage(),
      comments: bankComments,
      releaseDate: new Date().toISOString(),
    };

    onRelease(lc.lcId, swiftDetails);
    resetForm();
  };

  const generateSWIFTMessage = () => {
    return `MT103 - Single Customer Credit Transfer
From: ${lc.issuingBank || 'Issuing Bank'}
To: ${lc.advisingBank || 'Advising Bank'}
Amount: ${lc.currency} ${lc.amount?.toLocaleString()}
Beneficiary: ${lc.exporterId || lc.beneficiary}
Reference: ${paymentReference}
LC Number: ${lc.lcNumber || lc.lcId}`;
  };

  const resetForm = () => {
    setConfirmations({
      documentsVerified: false,
      amountConfirmed: false,
      beneficiaryConfirmed: false,
      swiftReady: false,
    });
    setPaymentReference('');
    setBankComments('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Payment sx={{ color: '#9b30b7' }} />
            <Typography variant="h6" fontWeight={600}>
              Release Payment - LC {lc?.lcId}
            </Typography>
          </Box>
          <Chip label="FINAL STEP" color="success" />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="success" sx={{ mb: 3 }}>
          <strong>Documents Verified</strong> - All documents comply with LC terms. Ready to release payment.
        </Alert>

        {/* Payment Summary */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f0f7ff', borderRadius: 1, border: '2px solid #2196f3' }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Payment Amount</Typography>
              <Typography variant="h6" fontWeight={700} color="primary">
                {lc?.currency} {lc?.amount?.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Beneficiary</Typography>
              <Typography variant="body1" fontWeight={600}>
                {lc?.exporterId || lc?.beneficiary}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Issuing Bank</Typography>
              <Typography variant="body2">{lc?.issuingBank || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Advising Bank</Typography>
              <Typography variant="body2">{lc?.advisingBank || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">LC Number</Typography>
              <Typography variant="body2">{lc?.lcNumber || lc?.lcId}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Contract ID</Typography>
              <Typography variant="body2">{lc?.contractId || 'N/A'}</Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Pre-Release Checklist */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Pre-Release Verification
        </Typography>

        <List>
          <ListItem>
            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmations.documentsVerified}
                  onChange={(e) => setConfirmations({...confirmations, documentsVerified: e.target.checked})}
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>Documents Verified</Typography>
                  <Typography variant="caption" color="textSecondary">
                    All documents examined and found compliant with LC terms (UCP 600 Article 14)
                  </Typography>
                </Box>
              }
            />
          </ListItem>

          <ListItem>
            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmations.amountConfirmed}
                  onChange={(e) => setConfirmations({...confirmations, amountConfirmed: e.target.checked})}
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>Amount Confirmed</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Payment amount matches LC value: {lc?.currency} {lc?.amount?.toLocaleString()}
                  </Typography>
                </Box>
              }
            />
          </ListItem>

          <ListItem>
            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmations.beneficiaryConfirmed}
                  onChange={(e) => setConfirmations({...confirmations, beneficiaryConfirmed: e.target.checked})}
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>Beneficiary Confirmed</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Beneficiary details verified: {lc?.exporterId || lc?.beneficiary}
                  </Typography>
                </Box>
              }
            />
          </ListItem>

          <ListItem>
            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmations.swiftReady}
                  onChange={(e) => setConfirmations({...confirmations, swiftReady: e.target.checked})}
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>SWIFT System Ready</Typography>
                  <Typography variant="caption" color="textSecondary">
                    SWIFT connection active and ready to transmit MT103 message
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Payment Reference */}
        <TextField
          fullWidth
          required
          label="Payment Reference Number"
          placeholder="e.g., PAY-2026-12345"
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
          sx={{ mb: 2 }}
          helperText="Unique payment reference for tracking"
        />

        {/* Bank Comments */}
        <TextField
          fullWidth
          label="Bank Comments (Optional)"
          placeholder="Additional notes or instructions..."
          value={bankComments}
          onChange={(e) => setBankComments(e.target.value)}
          multiline
          rows={2}
        />

        {/* SWIFT Message Preview */}
        {paymentReference && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary" gutterBottom display="block">
              SWIFT Message Preview (MT103)
            </Typography>
            <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {generateSWIFTMessage()}
            </Typography>
          </Box>
        )}

        {/* Warning */}
        <Alert severity="warning" sx={{ mt: 2 }}>
          <strong>Important:</strong> This action is irreversible. Ensure all checks are completed before releasing payment.
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<AttachMoney />}
          onClick={handleRelease}
          disabled={!allConfirmed || !paymentReference.trim()}
          sx={{ minWidth: 180 }}
        >
          Release Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
};
